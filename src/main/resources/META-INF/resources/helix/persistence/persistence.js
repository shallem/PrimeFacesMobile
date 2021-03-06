/**
 * Copyright (c) 2010 Zef Hemel <zef@zef.me>
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

if (typeof exports !== 'undefined') {
    exports.createPersistence = function() {
        return initPersistence({})
    }
    var singleton;
    if (typeof (exports.__defineGetter__) === 'function') {
        exports.__defineGetter__("persistence", function () {
            if (!singleton)
                singleton = exports.createPersistence();
            return singleton;
        });
    } else {
        Object.defineProperty(exports, "persistence", {
            get: function () {
                if (!singleton)
                    singleton = exports.createPersistence();
                return singleton;
            },
            enumerable: true,
            configurable: true
        });
    }

}
else {
    window = window || {};
    window.persistence = initPersistence(window.persistence || {});
}


function initPersistence(persistence) {
    if (persistence.isImmutable) // already initialized
        return persistence;

    /**
     * Check for immutable fields
     */
    persistence.isImmutable = function(fieldName) {
        return (fieldName == "id");
    };

    /**
     * Mobile Helix
     * Default global error handler.
     */
    persistence.errorHandler = function(errMsg, code, stmt, args) {
        if (Helix.ignoreErrors) {
            return false;
        }
        var msg = (code ? (code + ": ") : "") + errMsg + " in statement: " + stmt; 
        Helix.Utils.statusMessage("Database Error", msg, "severe");
        return false;
    };

    /**
     * Default implementation for entity-property
    */
    persistence.defineProp = function(scope, field, setterCallback, getterCallback) {
        if (typeof (scope.__defineSetter__) === 'function' && typeof (scope.__defineGetter__) === 'function') {
            scope.__defineSetter__(field, function (value) {
                //setterCallback(value);
                setterCallback.apply(this, [ value ]);
            });
            scope.__defineGetter__(field, function () {
                //return getterCallback();
                return getterCallback.apply(this);
            });
        } else {
            var that = this;
            Object.defineProperty(scope, field, {
                get: function() {
                    getterCallback.apply(that);
                },
                set: function (value) {
                    setterCallback.apply(that, [ value ]);
                },
                enumerable: true,
                configurable: true
            });
        }
    };

    /**
     * Default implementation for entity-property setter
     */
    persistence.set = function(scope, fieldName, value) {
        if (persistence.isImmutable(fieldName)) throw new Error("immutable field: "+fieldName);
        scope[fieldName] = value;
    };

    /**
     * Default implementation for entity-property getter
     */
    persistence.get = function(arg1, arg2) {
        return (arguments.length == 1) ? arg1 : arg1[arg2];
    };


    (function () {
        var entityMeta = {};
        var entityClassCache = {};
        persistence.getEntityMeta = function() {
            return entityMeta;
        }

        // Per-session data
        persistence.trackedObjects = {};
        persistence.objectsToRemove = {};
        persistence.globalPropertyListeners = {}; // EntityType__prop -> QueryColleciton obj
        persistence.queryCollectionCache = {}; // entityName -> uniqueString -> QueryCollection

        persistence.getObjectsToRemove = function() {
            return this.objectsToRemove;
        };
        persistence.getTrackedObjects = function() {
            return this.trackedObjects;
        };

        // Public Extension hooks
        persistence.entityDecoratorHooks = [];
        persistence.flushHooks = [];
        persistence.schemaSyncHooks = [];
        persistence.nextSchemaSyncHooks = [];

        // Enable debugging (display queries using console.log etc)
        persistence.debug = false;

        persistence.subscribeToGlobalPropertyListener = function(coll, entityName, property) {
            var key = entityName + '__' + property;
            if(key in this.globalPropertyListeners) {
                var listeners = this.globalPropertyListeners[key];
                for(var i = 0; i < listeners.length; i++) {
                    if(listeners[i] === coll) {
                        return;
                    }
                }
                this.globalPropertyListeners[key].push(coll);
            } else {
                this.globalPropertyListeners[key] = [coll];
            }
        }

        persistence.unsubscribeFromGlobalPropertyListener = function(coll, entityName, property) {
            var key = entityName + '__' + property;
            var listeners = this.globalPropertyListeners[key];
            for(var i = 0; i < listeners.length; i++) {
                if(listeners[i] === coll) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        }

        persistence.propertyChanged = function(obj, property, oldValue, newValue) {
            if(!this.trackedObjects[obj.id]) return; // not yet added, ignore for now

            var entityName = obj._type;
            var key = entityName + '__' + property;
            if(key in this.globalPropertyListeners) {
                var listeners = this.globalPropertyListeners[key];
                for(var i = 0; i < listeners.length; i++) {
                    var coll = listeners[i];
                    var dummyObj = obj._data;
                    dummyObj[property] = oldValue;
                    var matchedBefore = coll._filter.match(dummyObj);
                    dummyObj[property] = newValue;
                    var matchedAfter = coll._filter.match(dummyObj);
                    if(matchedBefore != matchedAfter) {
                        coll.triggerEvent('change', coll, obj);
                    }
                }
            }
        }

        persistence.objectRemoved = function(obj) {
            var entityName = obj._type;
            if(this.queryCollectionCache[entityName]) {
                var colls = this.queryCollectionCache[entityName];
                for(var key in colls) {
                    if(colls.hasOwnProperty(key)) {
                        var coll = colls[key];
                        if(coll._filter.match(obj)) { // matched the filter -> was part of collection
                            coll.triggerEvent('change', coll, obj);
                        }
                    }
                }
            }
        }

        /**
         * To keep queries small we use single or multi-letter aliases.
         */
        var currentPrefix = 'a';
        function getNextLetter() {
            var ch = currentPrefix.charAt(currentPrefix.length - 1);
            if (ch == 'z') {
                currentPrefix = currentPrefix + 'a';
            } else {
                var nxtCh = String.fromCharCode(ch.charCodeAt(0) + 1);
                currentPrefix = currentPrefix.substring(0, currentPrefix.length - 2) + nxtCh;
            }
            return currentPrefix;
        }

        /**
         * Retrieves metadata about entity, mostly for internal use
         */
        function getMeta(entityName) {
            return entityMeta[entityName];
        }

        persistence.getMeta = getMeta;


        /**
         * A database session
         */
        function Session(conn) {
            this.trackedObjects = {};
            this.objectsToRemove = {};
            this.globalPropertyListeners = {}; // EntityType__prop -> QueryColleciton obj
            this.queryCollectionCache = {}; // entityName -> uniqueString -> QueryCollection
            this.conn = conn;
        }

        Session.prototype = persistence; // Inherit everything from the root persistence object

        persistence.Session = Session;

        /**
         * Define an entity
         *
         * @param entityName
         *            the name of the entity (also the table name in the database)
         * @param fields
         *            an object with property names as keys and SQLite types as
         *            values, e.g. {name: "TEXT", age: "INT"}
         * @param doForce
         *            forces the schema to be over-written rather than using a cached
         *            copy if the schema has been previously defined.
         * @return the entity's constructor
         */
        persistence.define = function (entityName, fields, doForce) {
            if (!doForce && entityMeta[entityName]) { // Already defined, ignore
                return getEntity(entityName, false);
            }
            var meta = {
                name: entityName,
                fields: fields,
                isMixin: false,
                indexes: [],
                hasMany: {},
                hasOne: {},
                alias: getNextLetter()
            };
            entityMeta[entityName] = meta;
            return getEntity(entityName, true);
        };

        /**
        * Checks whether an entity exists
        *
        * @param entityName
        *            the name of the entity (also the table name in the database)
        * @return `true` if the entity exists, otherwise `false`
        */
        persistence.isDefined = function (entityName) {
            return !!entityMeta[entityName];
        }

        /**
        * Define a mixin
        *
        * @param mixinName
        *            the name of the mixin
        * @param fields
        *            an object with property names as keys and SQLite types as
        *            values, e.g. {name: "TEXT", age: "INT"}
        * @return the entity's constructor
        */
        persistence.defineMixin = function (mixinName, fields) {
            var Entity = this.define(mixinName, fields);
            Entity.meta.isMixin = true;
            return Entity;
        };

        persistence.isTransaction = function(obj) {
            return !obj || (obj && obj.executeSql);
        };

        persistence.isSession = function(obj) {
            return !obj || (obj && obj.schemaSync);
        };

        /**
        * Adds the object to tracked entities to be persisted
        *
        * @param obj
        *            the object to be tracked
        */
        persistence.add = function (obj) {
            if(!obj) return null;
            if (!this.trackedObjects[obj.id]) {
                this.trackedObjects[obj.id] = obj;
                return obj;
            } else {
                return this.trackedObjects[obj.id];
            }
        };
        
        persistence.canonical = function(obj) {
            if(!obj) return null;
            if (!this.trackedObjects[obj.id]) {
                return obj;
            } else {
                return this.trackedObjects[obj.id];
            }
        };

        /**
         * Marks the object to be removed (on next flush)
         * @param obj object to be removed
         */
        persistence.remove = function(obj, keyField, keyValue) {
            if (!keyField) {
                keyField = 'id';
            }
            if (!keyValue) {
                keyValue = obj.id;
            }
            
            var lookupKey = keyField + '=' + keyValue;
            if (!this.objectsToRemove[lookupKey]) {
                this.objectsToRemove[lookupKey] = obj;
            }
            // SAH - turn off event triggering.
            // this.objectRemoved(obj);
            return this;
        };
        
        persistence.getRemoveKeyValuePair = function(removeID) {
            var eqPos = removeID.indexOf('=');
            if (eqPos > 0) {
                return [ removeID.substring(0, eqPos), removeID.substring(eqPos + 1) ];
            }
            
            return removeID;
        };


        /**
     * Clean the persistence context of cached entities and such.
     */
        persistence.clean = function () {
            this.trackedObjects = {};
            this.objectsToRemove = {};
            this.globalPropertyListeners = {};
            this.queryCollectionCache = {};
        };

    /**
     * asynchronous sequential version of Array.prototype.forEach
     * @param array the array to iterate over
     * @param fn the function to apply to each item in the array, function
     *        has two argument, the first is the item value, the second a
     *        callback function
     * @param callback the function to call when the forEach has ended
     */
        persistence.asyncForEach = function(array, fn, callback) {
            array = array.slice(0); // Just to be sure
            function processOne() {
                var item = array.pop();
                fn(item, function(result, err) {
                    // stop if we hit an error.
                    if(!err & array.length > 0) {
                        processOne();
                    } else {
                        callback(result, err);
                    }
                });
            }
            if(array.length > 0) {
                processOne();
            } else {
                callback();
            }
        };

        /**
     * asynchronous parallel version of Array.prototype.forEach
     * @param array the array to iterate over
     * @param fn the function to apply to each item in the array, function
     *        has two argument, the first is the item value, the second a
     *        callback function
     * @param callback the function to call when the forEach has ended
     * @param opaque argument to pass to fn and callback
     */
        persistence.asyncParForEach = function(array, fn, callback, opaque) {
            var completed = 0;
            var arLength = array.length;
            if(arLength === 0) {
                callback(undefined, undefined, opaque);
            }
            persistence.transaction(function(tx) {
                for(var i = 0; i < arLength; i++) {
                    fn(array[i], function(result, err) {
                        completed++;
                        if(completed === arLength) {
                            callback(result, err, opaque);
                        }
                    }, opaque, tx);
                }
            })
        };

        /**
         * Retrieves or creates an entity constructor function for a given
         * entity name
         * @return the entity constructor function to be invoked with `new fn()`
         */
        function _makeGetter(field) {
            return function() {
                return persistence.canonical(this)._data[field];
            };
        }
        
        function _makeSetter(field) {
            return function(val) {
                var that = persistence.add(this);
                that._data[field] = val;
                that._dirtyProperties[field] = true;
                that._ignoreProperties[field] = false;                
            };
        }
        
        function getEntity(entityName, doForce) {
            if (!doForce && entityClassCache[entityName]) {
                return entityClassCache[entityName];
            }
            var meta = entityMeta[entityName];
            var props = {};
            for ( var field in meta.fields) {
                if (meta.fields.hasOwnProperty(field)) {
                    props[field] = {
                        enumerable: true,
                        get: _makeGetter(field),
                        set: _makeSetter(field)
                    }
                }
            }

            /**
             * @constructor
             */
            function _addField(session, field) {
                var args = argspec.getArgs(arguments, [
                {
                    name: "session",
                    optional: true,
                    check: persistence.isSession,
                    defaultValue: persistence
                },
                {
                    name: "field",
                    optional: false,
                    check: argspec.hasType('string')
                }
                ]);
                session = args.session;
                field = args.field;
                props[field] = {
                    enumerable: true,
                    get: _makeGetter(field),
                    set: _makeSetter(field)
                }

                /*var f = field; // Javascript scopes/closures SUCK
                persistence.defineProp(this, f, function(val) {
                    // setterCallback
                    // SAH - make sure we are tracking this object now that it is dirty.
                    var that = session.add(this);       
                    that._data[f] = val;
                    that._dirtyProperties[f] = true;
                    that._ignoreProperties[f] = false;
                }, function() {
                    // getterCallback
                    return persistence.canonical(this)._data[f];
                });*/
            };

            function Entity (session, obj, noEvents) {
                var args = argspec.getArgs(arguments, [
                {
                    name: "session",
                    optional: true,
                    check: persistence.isSession,
                    defaultValue: persistence
                },
                {
                    name: "obj",
                    optional: true,
                    check: function(obj) {
                        return obj;
                    },
                    defaultValue: {}
                }
                ]);
                if (meta.isMixin)
                    throw new Error("Cannot instantiate mixin");
                session = args.session;
                obj = args.obj;

                this.id = obj.id || persistence.createUUID();
                this._new = true;
                this._type = entityName;
                this._dirtyProperties = {};
                this._ignoreProperties = {};
                this._data = {};
                this._data_obj = {}; // references to objects
                this._session = session || persistence;
                this.subscribers = {}; // observable

                /*for ( var field in meta.fields) {
                    if (meta.fields.hasOwnProperty(field)) {
                        _addField.call(this, session, field);
                    }
                }*/
                Object.defineProperties(this, props);

                for ( var it in meta.hasOne) {
                    if (meta.hasOne.hasOwnProperty(it)) {
                        (function (entity) {
                            var ref = it;
                            var mixinClass = meta.hasOne[it].type.meta.isMixin ? ref + '_class' : null;
                            persistence.defineProp(entity, ref, function(val) {
                                // setterCallback
                                var that = session.add(this);
                                if (val == null) {
                                    that._data[ref] = null;
                                    that._data_obj[ref] = undefined;
                                    if (mixinClass)
                                        that[mixinClass] = '';
                                } else if (val.id) {
                                    that._data[ref] = val.id;
                                    that._data_obj[ref] = val;
                                    if (mixinClass)
                                        that[mixinClass] = val._type;
                                } else { // let's assume it's an id
                                    that._data[ref] = val;
                                }
                                that._dirtyProperties[ref] = true;
                            }, function() {
                                // getterCallback
                                var that = persistence.canonical(this);
                                if (!that._data[ref]) {
                                    return null;
                                } else if(that._data_obj[ref] !== undefined) {
                                    return that._data_obj[ref];
                                } else if(that._data[ref] && session.trackedObjects[that._data[ref]]) {
                                    that._data_obj[ref] = session.trackedObjects[that._data[ref]];
                                    return that._data_obj[ref];
                                } else {
                                    throw new Error("Property '" + ref + "' of '" + meta.name + "' with id: " + this._data[ref] + " not fetched, either prefetch it or fetch it manually.");
                                }
                            });
                        }(this));
                    }
                }

                for ( var it in meta.hasMany) {
                    if (meta.hasMany.hasOwnProperty(it)) {
                        (function (entity) {
                            var coll = it;
                            if (meta.hasMany[coll].manyToMany) {
                                persistence.defineProp(entity, coll, function(val) {
                                    // setterCallback
                                    // SAH - setting the value of a query collection field directly
                                    // makes no semantic sense. Do not support it in any way ...
                                    throw new Error("A query collection field cannot be set. Manipulate the contents of the query collection through the collection API.");
                                }, function() {
                                    // getterCallback
                                    var that = persistence.canonical(this);
                                    if (that._data[coll]) {
                                        return that._data[coll];
                                    } else {
                                        var rel = meta.hasMany[coll];
                                        var inverseMeta = rel.type.meta;
                                        var inv = inverseMeta.hasMany[rel.inverseProperty];
                                        var direct = rel.mixin ? rel.mixin.meta.name : meta.name;
                                        var inverse = inv.mixin ? inv.mixin.meta.name : inverseMeta.name;

                                        var queryColl = new persistence.ManyToManyDbQueryCollection(session, inverseMeta.name);
                                        queryColl.initManyToMany(that, coll);
                                        queryColl._manyToManyFetch = {
                                            table: rel.tableName,
                                            prop: direct + '_' + coll,
                                            inverseProp: inverse + '_' + rel.inverseProperty,
                                            id: that.id
                                        };
                                        that._data[coll] = queryColl;
                                        return session.uniqueQueryCollection(queryColl);
                                    }
                                });
                            } else { // one to many
                                persistence.defineProp(entity, coll, function(val) {
                                    // setterCallback
                                    // SAH - setting the value of a query collection field directly
                                    // makes no semantic sense. Do not support it in any way ...
                                    throw new Error("A query collection field cannot be set. Manipulate the contents of the query collection through the collection API.");
                                }, function() {
                                    // getterCallback
                                    var that = persistence.canonical(this);
                                    if (that._data[coll]) {
                                        return that._data[coll];
                                    } else {
                                        var queryColl = 
                                            session.uniqueQueryCollection(new persistence.DbQueryCollection(session, meta.hasMany[coll].type.meta.name).filter(meta.hasMany[coll].inverseProperty, '=', that));
                                        that._data[coll] = queryColl;
                                        return queryColl;
                                    }
                                });
                            }
                        }(this));
                    }
                }

                if(this.initialize) {
                    this.initialize();
                }

                for ( var f in obj) {
                    if (obj.hasOwnProperty(f)) {
                        if(f !== 'id') {
                            persistence.set(this, f, obj[f]);
                        }
                    }
                }
            } // Entity

            Entity.prototype = new Observable();

            Entity.meta = meta;

            Entity.prototype.equals = function(other) {
                return this.id == other.id;
            };

            /* SAH - ignore a named field until its value is reset. */
            Entity.prototype.ignoreField = function(fld) {
                this._ignoreProperties[fld] = true;
            };

            /* SAH - mark an object as already in the DB. Used to enhance the sync speed. See updateOneObject in 
             * persistence.helix.js. Requires the DB id so that we can correlate this object against what we have
             * in the DB.
             */
            Entity.prototype.markPersistent = function(id) {
                this._new = false;
                this.id = id;
            };

            Entity.prototype.toJSON = function() {
                var json = {
                    id: this.id
                };
                for(var p in this._data) {
                    if(this._data.hasOwnProperty(p)) {
                        if (typeof this._data[p] == "object" && this._data[p] != null) {
                            if (this._data[p].toJSON != undefined) {
                                json[p] = this._data[p].toJSON();
                            }
                        } else {
                            json[p] = this._data[p];
                        }
                    }
                }
                return json;
            };


            /**
       * Select a subset of data as a JSON structure (Javascript object)
       *
       * A property specification is passed that selects the
       * properties to be part of the resulting JSON object. Examples:
       *    ['id', 'name'] -> Will return an object with the id and name property of this entity
       *    ['*'] -> Will return an object with all the properties of this entity, not recursive
       *    ['project.name'] -> will return an object with a project property which has a name
       *                        property containing the project name (hasOne relationship)
       *    ['project.[id, name]'] -> will return an object with a project property which has an
       *                              id and name property containing the project name
       *                              (hasOne relationship)
       *    ['tags.name'] -> will return an object with an array `tags` property containing
       *                     objects each with a single property: name
       *
       * @param tx database transaction to use, leave out to start a new one
       * @param props a property specification
       * @param callback(result)
       */
            Entity.prototype.selectJSON = function(tx, props, callback) {
                var that = this;
                var args = argspec.getArgs(arguments, [
                {
                    name: "tx",
                    optional: true,
                    check: persistence.isTransaction,
                    defaultValue: null
                },
                {
                    name: "props",
                    optional: false
                },
                {
                    name: "callback",
                    optional: false
                }
                ]);
                tx = args.tx;
                props = args.props;
                callback = args.callback;

                if(!tx) {
                    this._session.transaction(function(tx) {
                        that.selectJSON(tx, props, callback);
                    });
                    return;
                }
                var includeProperties = {};
                props.forEach(function(prop) {
                    var current = includeProperties;
                    var parts = prop.split('.');
                    for(var i = 0; i < parts.length; i++) {
                        var part = parts[i];
                        if(i === parts.length-1) {
                            if(part === '*') {
                                current.id = true;
                                for(var p in meta.fields) {
                                    if(meta.fields.hasOwnProperty(p)) {
                                        current[p] = true;
                                    }
                                }
                                for(var p in meta.hasOne) {
                                    if(meta.hasOne.hasOwnProperty(p)) {
                                        current[p] = true;
                                    }
                                }
                                for(var p in meta.hasMany) {
                                    if(meta.hasMany.hasOwnProperty(p)) {
                                        current[p] = true;
                                    }
                                }
                            } else if(part[0] === '[') {
                                part = part.substring(1, part.length-1);
                                var propList = part.split(/,\s*/);
                                propList.forEach(function(prop) {
                                    current[prop] = true;
                                });
                            } else {
                                current[part] = true;
                            }
                        } else {
                            current[part] = current[part] || {};
                            current = current[part];
                        }
                    }
                });
                buildJSON(this, tx, includeProperties, callback);
            };

            function buildJSON(that, tx, includeProperties, callback) {
                var session = that._session;
                var properties = [];
                var meta = getMeta(that._type);
                var fieldSpec = meta.fields;

                for(var p in includeProperties) {
                    if(includeProperties.hasOwnProperty(p)) {
                        properties.push(p);
                    }
                }

                var cheapProperties = [];
                var expensiveProperties = [];

                properties.forEach(function(p) {
                    if(includeProperties[p] === true && !meta.hasMany[p]) { // simple, loaded field
                        cheapProperties.push(p);
                    } else {
                        expensiveProperties.push(p);
                    }
                });

                var itemData = that._data;
                var item = {};

                cheapProperties.forEach(function(p) {
                    if(p === 'id') {
                        item.id = that.id;
                    } else if(meta.hasOne[p]) {
                        item[p] = itemData[p] ? {
                            id: itemData[p]
                        } : null;
                    } else {
                        item[p] = persistence.entityValToJson(itemData[p], fieldSpec[p]);
                    }
                });
                properties = expensiveProperties.slice();

                persistence.asyncForEach(properties, function(p, callback) {
                    if(meta.hasOne[p]) {
                        that.fetch(tx, p, function(obj) {
                            if(obj) {
                                buildJSON(obj, tx, includeProperties[p], function(result) {
                                    item[p] = result;
                                    callback();
                                });
                            } else {
                                item[p] = null;
                                callback();
                            }
                        });
                    } else if(meta.hasMany[p]) {
                        persistence.get(that, p).list(function(objs) {
                            item[p] = [];
                            persistence.asyncForEach(objs, function(obj, callback) {
                                var obj = objs.pop();
                                if(includeProperties[p] === true) {
                                    item[p].push({
                                        id: obj.id
                                    });
                                    callback();
                                } else {
                                    buildJSON(obj, tx, includeProperties[p], function(result) {
                                        item[p].push(result);
                                        callback();
                                    });
                                }
                            }, callback);
                        });
                    }
                }, function() {
                    callback(item);
                });
            }; // End of buildJson

            Entity.prototype.fetch = function(tx, rel, callback) {
                var args = argspec.getArgs(arguments, [
                {
                    name: 'tx',
                    optional: true,
                    check: persistence.isTransaction,
                    defaultValue: null
                },
                {
                    name: 'rel',
                    optional: false,
                    check: argspec.hasType('string')
                },
                {
                    name: 'callback',
                    optional: false,
                    check: argspec.isCallback()
                }
                ]);
                tx = args.tx;
                rel = args.rel;
                callback = args.callback;

                var that = this;
                var session = this._session;

                if(!tx) {
                    session.transaction(function(tx) {
                        that.fetch(tx, rel, callback);
                    });
                    return;
                }
                if(!this._data[rel]) { // null
                    if(callback) {
                        callback(null);
                    }
                } else if(this._data_obj[rel]) { // already loaded
                    if(callback) {
                        callback(this._data_obj[rel]);
                    }
                } else {
                    var type = meta.hasOne[rel].type;
                    if (type.meta.isMixin) {
                        type = getEntity(this._data[rel + '_class']);
                    }
                    type.load(session, tx, this._data[rel], function(obj) {
                        that._data_obj[rel] = obj;
                        if(callback) {
                            callback(obj);
                        }
                    });
                }
            };

            /**
       * Currently this is only required when changing JSON properties
       */
            Entity.prototype.markDirty = function(prop) {
                this._dirtyProperties[prop] = true;
            };

            Entity.addField = _addField;

            /**
       * Returns a QueryCollection implementation matching all instances
       * of this entity in the database
       */
            Entity.all = function(session) {
                var args = argspec.getArgs(arguments, [
                {
                    name: 'session',
                    optional: true,
                    check: persistence.isSession,
                    defaultValue: persistence
                }
                ]);
                session = args.session;
                return session.uniqueQueryCollection(new AllDbQueryCollection(session, entityName));
            };

            Entity.fromSelectJSON = function(session, tx, jsonObj, callback) {
                var args = argspec.getArgs(arguments, [
                {
                    name: 'session',
                    optional: true,
                    check: persistence.isSession,
                    defaultValue: persistence
                },
                {
                    name: 'tx',
                    optional: true,
                    check: persistence.isTransaction,
                    defaultValue: null
                },
                {
                    name: 'jsonObj',
                    optional: false
                },
                {
                    name: 'callback',
                    optional: false,
                    check: argspec.isCallback()
                }
                ]);
                session = args.session;
                tx = args.tx;
                jsonObj = args.jsonObj;
                callback = args.callback;

                if(!tx) {
                    session.transaction(function(tx) {
                        Entity.fromSelectJSON(session, tx, jsonObj, callback);
                    });
                    return;
                }

                if(typeof jsonObj === 'string') {
                    jsonObj = JSON.parse(jsonObj);
                }

                if(!jsonObj) {
                    callback(null)
                    ;
                    return;
                }

                function loadedObj(obj) {
                    if(!obj) {
                        obj = new Entity(session);
                        if(jsonObj.id) {
                            obj.id = jsonObj.id;
                        }
                    }
                    session.add(obj);
                    var expensiveProperties = [];
                    for(var p in jsonObj) {
                        if(jsonObj.hasOwnProperty(p)) {
                            if(p === 'id') {
                                continue;
                            } else if(meta.fields[p]) { // regular field
                                persistence.set(obj, p, persistence.jsonToEntityVal(jsonObj[p], meta.fields[p]));
                            } else if(meta.hasOne[p] || meta.hasMany[p]){
                                expensiveProperties.push(p);
                            }
                        }
                    }
                    persistence.asyncForEach(expensiveProperties, function(p, callback) {
                        if(meta.hasOne[p]) {
                            meta.hasOne[p].type.fromSelectJSON(session, tx, jsonObj[p], function(result) {
                                persistence.set(obj, p, result);
                                callback();
                            });
                        } else if(meta.hasMany[p]) {
                            var coll = persistence.get(obj, p);
                            var ar = jsonObj[p].slice(0);
                            var PropertyEntity = meta.hasMany[p].type;
                            // get all current items
                            coll.list(function(currentItems) {
                                persistence.asyncForEach(ar, function(item, callback) {
                                    PropertyEntity.fromSelectJSON(session, tx, item, function(result) {
                                        // Check if not already in collection
                                        for(var i = 0; i < currentItems.length; i++) {
                                            if(currentItems[i].id === result.id) {
                                                callback();
                                                return;
                                            }
                                        }
                                        coll.add(result);
                                        callback();
                                    });
                                }, function() {
                                    callback();
                                });
                            });
                        }
                    }, function() {
                        callback(obj);
                    });
                }
                if(jsonObj.id) {
                    Entity.load(session, tx, jsonObj.id, loadedObj);
                } else {
                    loadedObj(new Entity(session));
                }
            };

            Entity.load = function(session, tx, id, callback) {
                var args = argspec.getArgs(arguments, [
                {
                    name: 'session',
                    optional: true,
                    check: persistence.isSession,
                    defaultValue: persistence
                },
                {
                    name: 'tx',
                    optional: true,
                    check: persistence.isTransaction,
                    defaultValue: null
                },
                {
                    name: 'id',
                    optional: false,
                    check: argspec.hasType('string')
                },
                {
                    name: 'callback',
                    optional: true,
                    check: argspec.isCallback(),
                    defaultValue: function(){}
                }
                ]);
                Entity.findBy(args.session, "id", args.id, args.callback, args.tx);
            };

            Entity.findBy = function(session, property, value, callback, tx) {
                var args = argspec.getArgs(arguments, [
                {
                    name: 'session',
                    optional: true,
                    check: persistence.isSession,
                    defaultValue: persistence
                },
                {
                    name: 'property',
                    optional: false,
                    check: argspec.hasType('string')
                },
                {
                    name: 'value',
                    optional: false
                },
                {
                    name: 'callback',
                    optional: true,
                    check: argspec.isCallback(),
                    defaultValue: function(){}
                },
                {
                    name: 'tx',
                    optional: true,
                    check: persistence.isTransaction,
                    defaultValue: null
                }
                ]);
                session = args.session;
                property = args.property;
                value = args.value;
                callback = args.callback;

                if(property === 'id' && value in session.trackedObjects) {
                    callback(session.trackedObjects[value]);
                    return;
                }
                Entity.all(session).filter(property, "=", value).one(function(obj) {
                    callback(obj);
                }, tx);
            }


            Entity.index = function(cols,options) {
                var opts = options || {};
                if (typeof cols=="string") {
                    cols = [cols];
                }
                opts.columns = cols;
                meta.indexes.push(opts);
            };

            /**
       * Declares a one-to-many or many-to-many relationship to another entity
       * Whether 1:N or N:M is chosed depends on the inverse declaration
       * @param collName the name of the collection (becomes a property of
         *   Entity instances
         * @param otherEntity the constructor function of the entity to define
         *   the relation to
         * @param inverseRel the name of the inverse property (to be) defined on otherEntity
         */
            Entity.hasMany = function (collName, otherEntity, invRel) {
                var otherMeta = otherEntity.meta;
                if (otherMeta.hasMany[invRel]) {
                    // other side has declared it as a one-to-many relation too -> it's in
                    // fact many-to-many
                    var tableName = meta.name + "_" + collName + "_" + otherMeta.name;
                    var inverseTableName = otherMeta.name + '_' + invRel + '_' + meta.name;

                    if (tableName > inverseTableName) {
                        // Some arbitrary way to deterministically decide which table to generate
                        tableName = inverseTableName;
                    }
                    meta.hasMany[collName] = {
                        type: otherEntity,
                        inverseProperty: invRel,
                        manyToMany: true,
                        tableName: tableName
                    };
                    otherMeta.hasMany[invRel] = {
                        type: Entity,
                        inverseProperty: collName,
                        manyToMany: true,
                        tableName: tableName
                    };
                    delete meta.hasOne[collName];
                    delete meta.fields[collName + "_class"]; // in case it existed
                } else {
                    meta.hasMany[collName] = {
                        type: otherEntity,
                        inverseProperty: invRel
                    };
                    otherMeta.hasOne[invRel] = {
                        type: Entity,
                        inverseProperty: collName
                    };
                    if (meta.isMixin)
                        otherMeta.fields[invRel + "_class"] = persistence.typeMapper ? persistence.typeMapper.classNameType : "TEXT";
                }
            }

            Entity.hasOne = function (refName, otherEntity, inverseProperty) {
                meta.hasOne[refName] = {
                    type: otherEntity,
                    inverseProperty: inverseProperty
                };
                if (otherEntity.meta.isMixin)
                    meta.fields[refName + "_class"] = persistence.typeMapper ? persistence.typeMapper.classNameType : "TEXT";
            };

            Entity.is = function(mixin){
                var mixinMeta = mixin.meta;
                if (!mixinMeta.isMixin)
                    throw new Error("not a mixin: " + mixin);

                mixin.meta.mixedIns = mixin.meta.mixedIns || [];
                mixin.meta.mixedIns.push(meta);

                for (var field in mixinMeta.fields) {
                    if (mixinMeta.fields.hasOwnProperty(field))
                        meta.fields[field] = mixinMeta.fields[field];
                }
                for (var it in mixinMeta.hasOne) {
                    if (mixinMeta.hasOne.hasOwnProperty(it))
                        meta.hasOne[it] = mixinMeta.hasOne[it];
                }
                for (var it in mixinMeta.hasMany) {
                    if (mixinMeta.hasMany.hasOwnProperty(it)) {
                        mixinMeta.hasMany[it].mixin = mixin;
                        meta.hasMany[it] = mixinMeta.hasMany[it];
                    }
                }
            }

            // Allow decorator functions to add more stuff
            var fns = persistence.entityDecoratorHooks;
            for(var i = 0; i < fns.length; i++) {
                fns[i](Entity);
            }

            entityClassCache[entityName] = Entity;
            return Entity;
        }

        persistence.jsonToEntityVal = function(value, type) {
            if(type) {
                switch(type) {
                    case 'DATE':
                        if(typeof value === 'number') {
                            if (value > 1000000000000) {
                                // it's in milliseconds
                                return new Date(value);
                            } else {
                                return new Date(value * 1000);
                            }
                        } else {
                            return null;
                        }
                        break;
                    default:
                        return value;
                }
            } else {
                return value;
            }
        };

        persistence.entityValToJson = function(value, type) {
            if(type) {
                switch(type) {
                    case 'DATE':
                        if(value) {
                            value = new Date(value);
                            return Math.round(value.getTime() / 1000);
                        } else {
                            return null;
                        }
                        break;
                    default:
                        return value;
                }
            } else {
                return value;
            }
        };


        /**
     * Generates a UUID according to http://www.ietf.org/rfc/rfc4122.txt
     */
        function createUUID () {
            if(persistence.typeMapper && persistence.typeMapper.newUuid) {
                return persistence.typeMapper.newUuid();
            }
            var s = [];
            var hexDigits = "0123456789ABCDEF";
            for ( var i = 0; i < 32; i++) {
                s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
            }
            s[12] = "4";
            s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1);

            var uuid = s.join("");
            return uuid;
        }

        persistence.createUUID = createUUID;


        function defaultValue(type) {
            if(persistence.typeMapper && persistence.typeMapper.defaultValue) {
                return persistence.typeMapper.defaultValue(type);
            }
            switch(type) {
                case "TEXT":
                    return "";
                case "BOOL":
                    return false;
                default:
                    if(type.indexOf("INT") !== -1) {
                        return 0;
                    } else if(type.indexOf("CHAR") !== -1) {
                        return "";
                    } else {
                        return null;
                    }
            }
        }

        function arrayContains(ar, item) {
            var l = ar.length;
            for(var i = 0; i < l; i++) {
                var el = ar[i];
                if(el.equals && el.equals(item)) {
                    return true;
                } else if(el === item) {
                    return true;
                }
            }
            return false;
        }

        function arrayRemove(ar, item) {
            var l = ar.length;
            for(var i = 0; i < l; i++) {
                var el = ar[i];
                if(el.equals && el.equals(item)) {
                    ar.splice(i, 1);
                    return;
                } else if(el === item) {
                    ar.splice(i, 1);
                    return;
                }
            }
        }

        ////////////////// QUERY COLLECTIONS \\\\\\\\\\\\\\\\\\\\\\\

        function Subscription(obj, eventType, fn) {
            this.obj = obj;
            this.eventType = eventType;
            this.fn = fn;
        }

        Subscription.prototype.unsubscribe = function() {
            this.obj.removeEventListener(this.eventType, this.fn);
        };

        /**
     * Simple observable function constructor
     * @constructor
     */
        function Observable() {
            this.subscribers = {};
        }

        Observable.prototype.addEventListener = function (eventType, fn) {
            if (!this.subscribers[eventType]) {
                this.subscribers[eventType] = [];
            }
            this.subscribers[eventType].push(fn);
            return new Subscription(this, eventType, fn);
        };

        Observable.prototype.removeEventListener = function(eventType, fn) {
            var subscribers = this.subscribers[eventType];
            for ( var i = 0; i < subscribers.length; i++) {
                if(subscribers[i] == fn) {
                    this.subscribers[eventType].splice(i, 1);
                    return true;
                }
            }
            return false;
        };

        Observable.prototype.triggerEvent = function (eventType) {
            if (!this.subscribers[eventType]) { // No subscribers to this event type
                return;
            }
            var subscribers = this.subscribers[eventType].slice(0);
            for(var i = 0; i < subscribers.length; i++) {
                subscribers[i].apply(null, arguments);
            }
        };

        /*
     * Each filter has 4 methods:
     * - sql(prefix, values) -- returns a SQL representation of this filter,
     *     possibly pushing additional query arguments to `values` if ?'s are used
     *     in the query
     * - match(o) -- returns whether the filter matches the object o.
     * - makeFit(o) -- attempts to adapt the object o in such a way that it matches
     *     this filter.
     * - makeNotFit(o) -- the oppositive of makeFit, makes the object o NOT match
     *     this filter
     */

        /**
     * Default filter that does not filter on anything
     * currently it generates a 1=1 SQL query, which is kind of ugly
     */
        function NullFilter () {
        }

        NullFilter.prototype.match = function (o) {
            return true;
        };

        NullFilter.prototype.makeFit = function(o) {
        };

        NullFilter.prototype.makeNotFit = function(o) {
        };

        NullFilter.prototype.toUniqueString = function() {
            return "NULL";
        };

        NullFilter.prototype.subscribeGlobally = function() { };

        NullFilter.prototype.unsubscribeGlobally = function() { };

        /**
     * Filter that makes sure that both its left and right filter match
     * @param left left-hand filter object
     * @param right right-hand filter object
     */
        function AndFilter (left, right) {
            this.left = left;
            this.right = right;
        }

        AndFilter.prototype.match = function (o) {
            return this.left.match(o) && this.right.match(o);
        };

        AndFilter.prototype.makeFit = function(o) {
            this.left.makeFit(o);
            this.right.makeFit(o);
        };

        AndFilter.prototype.makeNotFit = function(o) {
            this.left.makeNotFit(o);
            this.right.makeNotFit(o);
        };

        AndFilter.prototype.toUniqueString = function() {
            return this.left.toUniqueString() + " AND " + this.right.toUniqueString();
        };

        AndFilter.prototype.subscribeGlobally = function(coll, entityName) {
            this.left.subscribeGlobally(coll, entityName);
            this.right.subscribeGlobally(coll, entityName);
        };

        AndFilter.prototype.unsubscribeGlobally = function(coll, entityName) {
            this.left.unsubscribeGlobally(coll, entityName);
            this.right.unsubscribeGlobally(coll, entityName);
        };

        /**
     * Filter that makes sure that either its left and right filter match
     * @param left left-hand filter object
     * @param right right-hand filter object
     */
        function OrFilter (left, right) {
            this.left = left;
            this.right = right;
        }

        OrFilter.prototype.match = function (o) {
            return this.left.match(o) || this.right.match(o);
        };

        OrFilter.prototype.makeFit = function(o) {
            this.left.makeFit(o);
            this.right.makeFit(o);
        };

        OrFilter.prototype.makeNotFit = function(o) {
            this.left.makeNotFit(o);
            this.right.makeNotFit(o);
        };

        OrFilter.prototype.toUniqueString = function() {
            return this.left.toUniqueString() + " OR " + this.right.toUniqueString();
        };

        OrFilter.prototype.subscribeGlobally = function(coll, entityName) {
            this.left.subscribeGlobally(coll, entityName);
            this.right.subscribeGlobally(coll, entityName);
        };

        OrFilter.prototype.unsubscribeGlobally = function(coll, entityName) {
            this.left.unsubscribeGlobally(coll, entityName);
            this.right.unsubscribeGlobally(coll, entityName);
        };

        /**
     * Filter that checks whether a certain property matches some value, based on an
     * operator. Supported operators are '=', '!=', '<', '<=', '>' and '>='.
     * @param property the property name
     * @param operator the operator to compare with
     * @param value the literal value to compare to
     */
        function PropertyFilter (property, operator, value) {
            this.property = property;
            this.operator = operator.toLowerCase();
            this.value = value;
        }

        PropertyFilter.prototype.match = function (o) {
            var value = this.value;
            var propValue = persistence.get(o, this.property);
            if(value && value.getTime) { // DATE
                // TODO: Deal with arrays of dates for 'in' and 'not in'
                value = Math.round(value.getTime() / 1000) * 1000; // Deal with precision
                if(propValue && propValue.getTime) { // DATE
                    propValue = Math.round(propValue.getTime() / 1000) * 1000; // Deal with precision
                }
            }
            switch (this.operator) {
                case '=':
                    return propValue === value;
                    break;
                case '!=':
                    return propValue !== value;
                    break;
                case '<':
                    return propValue < value;
                    break;
                case '<=':
                    return propValue <= value;
                    break;
                case '>':
                    return propValue > value;
                    break;
                case '>=':
                    return propValue >= value;
                    break;
                case 'in':
                    return arrayContains(value, propValue);
                    break;
                case 'not in':
                    return !arrayContains(value, propValue);
                    break;
            }
        };

        PropertyFilter.prototype.makeFit = function(o) {
            if(this.operator === '=') {
                if (this.value && this.value.id) {
                    // This case happens when we are trying to make an object fit in a one-to-many relationship.
                    persistence.set(o, this.property, this.value.id);
                } else {
                    persistence.set(o, this.property, this.value);
                }
            } else {
                throw new Error("Sorry, can't perform makeFit for other filters than =");
            }
        };

        PropertyFilter.prototype.makeNotFit = function(o) {
            if(this.operator === '=') {
                persistence.set(o, this.property, null);
            } else {
                throw new Error("Sorry, can't perform makeNotFit for other filters than =");
            }
        };

        PropertyFilter.prototype.subscribeGlobally = function(coll, entityName) {
            persistence.subscribeToGlobalPropertyListener(coll, entityName, this.property);
        };

        PropertyFilter.prototype.unsubscribeGlobally = function(coll, entityName) {
            persistence.unsubscribeFromGlobalPropertyListener(coll, entityName, this.property);
        };

        PropertyFilter.prototype.toUniqueString = function() {
            var val = this.value;
            if(val && val._type) {
                val = val.id;
            }
            return this.property + this.operator + val;
        };

        persistence.NullFilter = NullFilter;
        persistence.AndFilter = AndFilter;
        persistence.OrFilter = OrFilter;
        persistence.PropertyFilter = PropertyFilter;

        /**
     * Ensure global uniqueness of query collection object
     */
        persistence.uniqueQueryCollection = function(coll) {
            var entityName = coll._entityName;
            if(coll._items) { // LocalQueryCollection
                return coll;
            }
            if(!this.queryCollectionCache[entityName]) {
                this.queryCollectionCache[entityName] = {};
            }
            var uniqueString = coll.toUniqueString();
            if(!this.queryCollectionCache[entityName][uniqueString]) {
                this.queryCollectionCache[entityName][uniqueString] = coll;
            }
            return this.queryCollectionCache[entityName][uniqueString];
        }

        /**
     * The constructor function of the _abstract_ QueryCollection
     * DO NOT INSTANTIATE THIS
     * @constructor
     */
        function QueryCollection () {
        }

        QueryCollection.prototype = new Observable();

        QueryCollection.prototype.oldAddEventListener = QueryCollection.prototype.addEventListener;

        QueryCollection.prototype.setupSubscriptions = function() {
            this._filter.subscribeGlobally(this, this._entityName);
        };

        QueryCollection.prototype.teardownSubscriptions = function() {
            this._filter.unsubscribeGlobally(this, this._entityName);
        };

        QueryCollection.prototype.addEventListener = function(eventType, fn) {
            var that = this;
            var subscription = this.oldAddEventListener(eventType, fn);
            if(this.subscribers[eventType].length === 1) { // first subscriber
                this.setupSubscriptions();
            }
            subscription.oldUnsubscribe = subscription.unsubscribe;
            subscription.unsubscribe = function() {
                this.oldUnsubscribe();

                if(that.subscribers[eventType].length === 0) { // last subscriber
                    that.teardownSubscriptions();
                }
            };
            return subscription;
        };

        /**
     * Function called when session is flushed, returns list of SQL queries to execute
     * (as [query, arg] tuples)
     */
        QueryCollection.prototype.persistQueries = function() {
            return [];
        };

        /**
     * Invoked by sub-classes to initialize the query collection
     */
        QueryCollection.prototype.init = function (session, entityName, constructor) {
            this._filter = new NullFilter();
            this._orderColumns = []; // tuples of [column, ascending]
            this._prefetchFields = [];
            this._entityName = entityName;
            this._constructor = constructor;
            this._limit = -1;
            this._skip = 0;
            this._reverse = false;
            this._session = session || persistence;
            // For observable
            this.subscribers = {};
        }

        QueryCollection.prototype.toUniqueString = function() {
            var s = this._constructor.name + ": " + this._entityName;
            s += '|Filter:';
            var values = [];
            s += this._filter.toUniqueString();
            s += '|Values:';
            for(var i = 0; i < values.length; i++) {
                s += values + "|^|";
            }
            s += '|Order:';
            for(var i = 0; i < this._orderColumns.length; i++) {
                var col = this._orderColumns[i];
                s += col[0] + ", " + col[1] + ", " + col[2];
            }
            s += '|Prefetch:';
            for(var i = 0; i < this._prefetchFields.length; i++) {
                s += this._prefetchFields[i];
            }
            s += '|Includes:';
            if (this._includes) {
                for(var fld in this._includes) {
                    s += fld;
                }
            }
            s += '|Excludes:';
            if (this._excludes) {
                for(fld in this._excludes) {
                    s += fld;
                }
            }
            if (this._excludeRelationships) {
                s += '|NoRel';
            }
            if (this._noFlush) {
                s += '|NoFlush';
            }
            s += '|Limit:';
            s += this._limit;
            s += '|Skip:';
            s += this._skip;
            s += '|Reverse:';
            s += this._reverse;
            if (this._group) {
                s += '|Group:';
                s += JSON.stringify(this._group);
            }
            return s;
        };

        /**
     * Creates a clone of this query collection
     * @return a clone of the collection
     */
        QueryCollection.prototype.clone = function (cloneSubscribers) {
            var c = new (this._constructor)(this._session, this._entityName);
            c._filter = this._filter;
            c._prefetchFields = this._prefetchFields.slice(0); // clone
            c._orderColumns = this._orderColumns.slice(0);
            c._limit = this._limit;
            c._skip = this._skip;
            c._reverse = this._reverse;
            if(cloneSubscribers) {
                var subscribers = {};
                for(var eventType in this.subscribers) {
                    if(this.subscribers.hasOwnProperty(eventType)) {
                        subscribers[eventType] = this.subscribers[eventType].slice(0);
                    }
                }
                c.subscribers = subscribers; //this.subscribers;
            } else {
                c.subscribers = this.subscribers;
            }
            if (this._includes) {
                c._includes = this._includes;
            }
            if (this._excludes) {
                c._excludes = this._excludes;
            }
            if (this._group) {
                c._group = $.extend({}, this._group);
            }
            return c;
        };

        /**
     * Returns a new query collection with a property filter condition added
     * @param property the property to filter on
     * @param operator the operator to use
     * @param value the literal value that the property should match
     * @return the query collection with the filter added
     */
        QueryCollection.prototype.filter = function (property, operator, value) {
            var c = this.clone(true);
            c._filter = new AndFilter(this._filter, new PropertyFilter(property,
                operator, value));
            // Add global listener (TODO: memory leak waiting to happen!)
            var session = this._session;
            c = session.uniqueQueryCollection(c);
            //session.subscribeToGlobalPropertyListener(c, this._entityName, property);
            return session.uniqueQueryCollection(c);
        };

        /**
     * Returns a new query collection with an OR condition between the
     * current filter and the filter specified as argument
     * @param filter the other filter
     * @return the new query collection
     */
        QueryCollection.prototype.or = function (filter) {
            var c = this.clone(true);
            c._filter = new OrFilter(this._filter, filter);
            return this._session.uniqueQueryCollection(c);
        };

        /**
     * Returns a new query collection with an AND condition between the
     * current filter and the filter specified as argument
     * @param filter the other filter
     * @return the new query collection
     */
        QueryCollection.prototype.and = function (filter) {
            var c = this.clone(true);
            c._filter = new AndFilter(this._filter, filter);
            return this._session.uniqueQueryCollection(c);
        };

        /**
     * Returns a new query collection with an ordering imposed on the collection
     * @param property the property to sort on
     * @param ascending should the order be ascending (= true) or descending (= false)
     * @param caseSensitive should the order be case sensitive (= true) or case insensitive (= false)
     *        note: using case insensitive ordering for anything other than TEXT fields yields
     *        undefinded behavior
     * @return the query collection with imposed ordering
     */
        QueryCollection.prototype.order = function (property, ascending, caseSensitive) {
            ascending = ascending === undefined ? true : ascending;
            caseSensitive = caseSensitive === undefined ? true : caseSensitive;
            var c = this.clone();
            c._orderColumns.push( [ property, ascending, caseSensitive ]);
            return this._session.uniqueQueryCollection(c);
        };

        /**
     * Returns a new query collection will limit its size to n items
     * @param n the number of items to limit it to
     * @return the limited query collection
     */
        QueryCollection.prototype.limit = function(n) {
            var c = this.clone();
            c._limit = n;
            return this._session.uniqueQueryCollection(c);
        };

        /**
     * Returns a new query collection which will skip the first n results
     * @param n the number of results to skip
     * @return the query collection that will skip n items
     */
        QueryCollection.prototype.skip = function(n) {
            var c = this.clone();
            c._skip = n;
            return this._session.uniqueQueryCollection(c);
        };

        QueryCollection.prototype.group = function(groupByField, selectorField, selectorType) {
            var c = this.clone();
            c._group = {
                'by' : groupByField,
                'selector' : selectorField,
                'selectorType' : selectorType
            };
            return this._session.uniqueQueryCollection(c);
        };

        /**
     * Returns a new query collection which reverse the order of the result set
     * @return the query collection that will reverse its items
     */
        QueryCollection.prototype.reverse = function() {
            var c = this.clone();
            c._reverse = true;
            return this._session.uniqueQueryCollection(c);
        };
        
         /**
     * Returns a new query collection which clears the ordering of the result set
     * @return the query collection that will no longer has any imposed ordering
     */
        QueryCollection.prototype.clearOrder = function() {
            var c = this.clone();
            c._orderColumns = [];
            return this._session.uniqueQueryCollection(c);
        };

        /**
     * Returns a new query collection which will prefetch a certain object relationship.
     * Only works with 1:1 and N:1 relations.
     * Relation must target an entity, not a mix-in.
     * @param rel the relation name of the relation to prefetch
     * @return the query collection prefetching `rel`
     */
        QueryCollection.prototype.prefetch = function (rel) {
            var c = this.clone();
            c._prefetchFields.push(rel);
            return this._session.uniqueQueryCollection(c);
        };


        /**
     * Select a subset of data, represented by this query collection as a JSON
     * structure (Javascript object)
     *
     * @param tx database transaction to use, leave out to start a new one
     * @param props a property specification
     * @param callback(result)
     */
        QueryCollection.prototype.selectJSON = function(tx, props, callback) {
            var args = argspec.getArgs(arguments, [
            {
                name: "tx",
                optional: true,
                check: persistence.isTransaction,
                defaultValue: null
            },
            {
                name: "props",
                optional: false
            },
            {
                name: "callback",
                optional: false
            }
            ]);
            var session = this._session;
            var that = this;
            tx = args.tx;
            props = args.props;
            callback = args.callback;

            if(!tx) {
                session.transaction(function(tx) {
                    that.selectJSON(tx, props, callback);
                });
                return;
            }
            var Entity = getEntity(this._entityName);
            // TODO: This could do some clever prefetching to make it more efficient
            this.list(function(items) {
                var resultArray = [];
                persistence.asyncForEach(items, function(item, callback) {
                    item.selectJSON(tx, props, function(obj) {
                        resultArray.push(obj);
                        callback();
                    });
                }, function() {
                    callback(resultArray);
                });
            });
        };

        /**
     * Adds an object to a collection
     * @param obj the object to add
     */
        QueryCollection.prototype.add = function(obj) {
            if(!obj.id || !obj._type) {
                throw new Error("Cannot add object of non-entity type onto collection.");
            }
            this._session.add(obj);
            this._filter.makeFit(obj);
        }

        /**
     * Adds an an array of objects to a collection
     * @param obj the object to add
     */
        QueryCollection.prototype.addAll = function(objs) {
            for(var i = 0; i < objs.length; i++) {
                var obj = objs[i];
                this._session.add(obj);
                this._filter.makeFit(obj);
            }
        }

        /**
     * Removes an object from a collection
     * @param obj the object to remove from the collection
     */
        QueryCollection.prototype.remove = function(obj) {
            if(!obj.id || !obj._type) {
                throw new Error("Cannot remove object of non-entity type from collection.");
            }
            this._filter.makeNotFit(obj);
        }


        /**
     * A database implementation of the QueryCollection
     * @param entityName the name of the entity to create the collection for
     * @constructor
     */
        function DbQueryCollection (session, entityName) {
            this.init(session, entityName, DbQueryCollection);
        }

        /**
     * Execute a function for each item in the list. Replaces the callback below
     * which does not allow for much flexibility in argument specification.
     * @param tx the transaction to use (or null to open a new one)
     * @param callbacks Object containing up to 3 callbacks - one to execute on
     *   each element in the query collection (eachFn) one to execute at the start
     *   of the iteration (startFn, accepting the number of elements as an arg),
     *   and one to execute when the iteration is done (doneFn, also accepting the
     *   number of results as an argument).
     * @param opaque An optional parameter to supply to all callbacks.
     */
        QueryCollection.prototype.newEach = function (callbacks, opaque) {
            this.list(function(results,error) {
                if (!results) {
                    return;
                }
                if (callbacks.startFn) {
                    callbacks.startFn(results.length, opaque);
                }
                if (callbacks.eachFn) {
                    for(var i = 0; i < results.length; i++) {
                        callbacks.eachFn(results[i], opaque);
                    }
                }
                if (callbacks.doneFn) {
                    callbacks.doneFn(i, opaque);
                }
            });
        }

        /**
     * Restrict the set of fields selected to *exclude* those provided.
     */
        QueryCollection.prototype.exclude = function(fieldList) {
            var c = this.clone();
            c._excludes = {};
            for (var i = 0; i < fieldList.length; ++i) {
                c._excludes[fieldList[i]] = true;
            }
            return c;
        },

        /**
     * Restrict the set of fields selected to *include* those provided.
     */
        QueryCollection.prototype.include = function(fieldList) {
            var c = this.clone();
            c._includes = {};
            for (var i = 0; i < fieldList.length; ++i) {
                c._includes[fieldList[i]] = true;
            }
            return c;
        },
        
        /**
         * Do not include "relationship" fields in the query collection results.
         */
        QueryCollection.prototype.noRelationships = function() {
            var c = this.clone();
            c._excludeRelationships = true;
            return c;
        },

        /**
         * Do not flush to the DB before listing this query collection.
         */
        QueryCollection.prototype.noFlush = function() {
            var c = this.clone();
            c._noFlush = true;
            return c;
        },


        /**
     * Execute a function for each item in the list
     * @param tx the transaction to use (or null to open a new one)
     * @param eachFn (elem) the function to be executed for each item
     * @param doneFn (ct) called when the iteration is done, passing the number of items visited
     */
        QueryCollection.prototype.each = function (eachFn, startFn, doneFn) {
            this.list(function(results,error) {
                if (!results) {
                    if (error) {
                        alert(error);
                    }
                    return;
                }
                if (startFn) {
                    startFn(results.length);
                }
                for(var i = 0; i < results.length; i++) {
                    eachFn(results[i]);
                }
                if (doneFn) {
                    doneFn(i);
                }
            });
        }

        // Alias
        QueryCollection.prototype.forEach = QueryCollection.prototype.each;

        QueryCollection.prototype.one = function (oneFn, tx) {
            var that = this;

            this.limit(1).list(function(results) {
                if(!results || results.length === 0) {
                    oneFn(null);
                } else {
                    oneFn(results[0]);
                }
            }, tx);
        }

        DbQueryCollection.prototype = new QueryCollection();


        /**
     * An implementation of QueryCollection, that is used
     * to represent all instances of an entity type
     * @constructor
     */
        function AllDbQueryCollection (session, entityName) {
            this.init(session, entityName, AllDbQueryCollection);
        }

        AllDbQueryCollection.prototype = new DbQueryCollection();

        AllDbQueryCollection.prototype.add = function(obj) {
            this._session.add(obj);
        };

        AllDbQueryCollection.prototype.remove = function(obj) {
            this._session.remove(obj);
        };

        /**
     * A ManyToMany implementation of QueryCollection
     * @constructor
     */
        function ManyToManyDbQueryCollection (session, entityName) {
            this.init(session, entityName, persistence.ManyToManyDbQueryCollection);
            this._localAdded = [];
            this._localRemoved = [];
        }

        ManyToManyDbQueryCollection.prototype = new DbQueryCollection();

        ManyToManyDbQueryCollection.prototype.initManyToMany = function(obj, coll) {
            this._obj = obj;
            this._coll = coll;
        };

        ManyToManyDbQueryCollection.prototype.add = function(obj) {
            if(!arrayContains(this._localAdded, obj)) {
                this._session.add(obj);
                this._localAdded.push(obj);
            }
        };

        ManyToManyDbQueryCollection.prototype.addAll = function(objs) {
            for(var i = 0; i < objs.length; i++) {
                var obj = objs[i];
                if(!arrayContains(this._localAdded, obj)) {
                    this._session.add(obj);
                    this._localAdded.push(obj);
                }
            }
        }

        ManyToManyDbQueryCollection.prototype.clone = function() {
            var c = DbQueryCollection.prototype.clone.call(this);
            c._localAdded = this._localAdded;
            c._localRemoved = this._localRemoved;
            c._obj = this._obj;
            c._coll = this._coll;
            return c;
        };

        ManyToManyDbQueryCollection.prototype.remove = function(obj) {
            if(arrayContains(this._localAdded, obj)) { // added locally, can just remove it from there
                arrayRemove(this._localAdded, obj);
            } else if(!arrayContains(this._localRemoved, obj)) {
                this._localRemoved.push(obj);
            }
        };

        persistence.QueryCollection             = QueryCollection;
        persistence.DbQueryCollection           = DbQueryCollection;
        persistence.ManyToManyDbQueryCollection = ManyToManyDbQueryCollection;
        persistence.Observable                  = Observable;
        persistence.Subscription                = Subscription;
        persistence.AndFilter                   = AndFilter;
        persistence.OrFilter                    = OrFilter;
        persistence.PropertyFilter              = PropertyFilter;
    }());

    // ArgSpec.js library: http://github.com/zefhemel/argspecjs
    var argspec = {};

    (function() {
        argspec.getArgs = function(args, specs) {
            var argIdx = 0;
            var specIdx = 0;
            var argObj = {};
            while(specIdx < specs.length) {
                var s = specs[specIdx];
                var a = args[argIdx];
                if(s.optional) {
                    if(a !== undefined && s.check(a)) {
                        argObj[s.name] = a;
                        argIdx++;
                        specIdx++;
                    } else {
                        if(s.defaultValue !== undefined) {
                            argObj[s.name] = s.defaultValue;
                        }
                        specIdx++;
                    }
                } else {
                    if(s.check && !s.check(a)) {
                        throw new Error("Invalid value for argument: " + s.name + " Value: " + a);
                    }
                    argObj[s.name] = a;
                    specIdx++;
                    argIdx++;
                }
            }
            return argObj;
        }

        argspec.hasProperty = function(name) {
            return function(obj) {
                return obj && obj[name] !== undefined;
            };
        }

        argspec.hasType = function(type) {
            return function(obj) {
                return typeof obj === type;
            };
        }

        argspec.isCallback = function() {
            return function(obj) {
                return obj && obj.apply;
            };
        }
        
        argspec.isMap = function() {
            return function(obj) {
                return obj && Object.prototype.toString.call(obj) == "[object Object]";
            }
        }
    }());

    persistence.argspec = argspec;

    return persistence;
} // end of createPersistence



// JSON2 library, source: http://www.JSON.org/js.html
// Most modern browsers already support this natively, but mobile
// browsers often don't, hence this implementation
// Relevant APIs:
//    JSON.stringify(value, replacer, space)
//    JSON.parse(text, reviver)

if(typeof JSON === 'undefined') {
    JSON = {};
}
//var JSON = typeof JSON === 'undefined' ? window.JSON : {};
if (!JSON.stringify) {
    (function () {
        function f(n) {
            return n < 10 ? '0' + n : n;
        }
        if (typeof Date.prototype.toJSON !== 'function') {

            Date.prototype.toJSON = function (key) {

                return isFinite(this.valueOf()) ?
                this.getUTCFullYear()   + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate())      + 'T' +
                f(this.getUTCHours())     + ':' +
                f(this.getUTCMinutes())   + ':' +
                f(this.getUTCSeconds())   + 'Z' : null;
            };

            String.prototype.toJSON =
            Number.prototype.toJSON =
            Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };
        }

        var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap, indent,
        meta = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;

        function quote(string) {
            escapable.lastIndex = 0;
            return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
        }


        function str(key, holder) {
            var i, k, v, length, mind = gap, partial, value = holder[key];

            if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
                value = value.toJSON(key);
            }

            if (typeof rep === 'function') {
                value = rep.call(holder, key, value);
            }

            switch (typeof value) {
                case 'string':
                    return quote(value);
                case 'number':
                    return isFinite(value) ? String(value) : 'null';
                case 'boolean':
                case 'null':
                    return String(value);
                case 'object':
                    if (!value) {
                        return 'null';
                    }

                    gap += indent;
                    partial = [];

                    if (Object.prototype.toString.apply(value) === '[object Array]') {
                        length = value.length;
                        for (i = 0; i < length; i += 1) {
                            partial[i] = str(i, value) || 'null';
                        }

                        v = partial.length === 0 ? '[]' :
                        gap ? '[\n' + gap +
                        partial.join(',\n' + gap) + '\n' +
                        mind + ']' :
                        '[' + partial.join(',') + ']';
                        gap = mind;
                        return v;
                    }

                    if (rep && typeof rep === 'object') {
                        length = rep.length;
                        for (i = 0; i < length; i += 1) {
                            k = rep[i];
                            if (typeof k === 'string') {
                                v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (gap ? ': ' : ':') + v);
                                }
                            }
                        }
                    } else {
                        for (k in value) {
                            if (Object.hasOwnProperty.call(value, k)) {
                                v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (gap ? ': ' : ':') + v);
                                }
                            }
                        }
                    }

                    v = partial.length === 0 ? '{}' :
                    gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                    mind + '}' : '{' + partial.join(',') + '}';
                    gap = mind;
                    return v;
            }
        }

        if (typeof JSON.stringify !== 'function') {
            JSON.stringify = function (value, replacer, space) {
                var i;
                gap = '';
                indent = '';
                if (typeof space === 'number') {
                    for (i = 0; i < space; i += 1) {
                        indent += ' ';
                    }
                } else if (typeof space === 'string') {
                    indent = space;
                }

                rep = replacer;
                if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                        typeof replacer.length !== 'number')) {
                    throw new Error('JSON.stringify');
                }

                return str('', {
                    '': value
                });
            };
        }

        if (typeof JSON.parse !== 'function') {
            JSON.parse = function (text, reviver) {
                var j;
                function walk(holder, key) {
                    var k, v, value = holder[key];
                    if (value && typeof value === 'object') {
                        for (k in value) {
                            if (Object.hasOwnProperty.call(value, k)) {
                                v = walk(value, k);
                                if (v !== undefined) {
                                    value[k] = v;
                                } else {
                                    delete value[k];
                                }
                            }
                        }
                    }
                    return reviver.call(holder, key, value);
                }

                cx.lastIndex = 0;
                if (cx.test(text)) {
                    text = text.replace(cx, function (a) {
                        return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                    });
                }

                if (/^[\],:{}\s]*$/.
                    test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
                        replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
                        replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
                    j = eval('(' + text + ')');
                    return typeof reviver === 'function' ?
                    walk({
                        '': j
                    }, '') : j;
                }
                throw new SyntaxError('JSON.parse');
            };
        }
    }());
}

