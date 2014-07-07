/*
 * Copyright 2013 Mobile Helix, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Integrates Persistence JS ORM with the PrimeFaces Mobile SDK.
 */

function initHelixDB() {
    Helix.DB = {
        
        __masterDBVer : 1,
        
        __schemaVersion: 0,
        
        __indexingMessageShown: false,
        
        __indexingCount: 0,
        
        indexFull: false,
        
        reservedFields : {
            "__hx_sorts" : true,
            "__hx_key" : true,
            "__hx_schema_name" : true,
            "__hx_filters" : true,
            "__hx_text_index" : true,
            "__hx_schema_type" : true,
            "__hx_global_filters" : true
        },

        generatePersistenceFields: function(schemaTemplate,name,allVisited,recursiveFields,allSchemas) {
            var schemaFields = {};
            var subSchemas = {};

            var oneToMany = [];
            var manyToOne = [];
            var myRecursiveFields = [];

            // Check to see if this is a schema forward ref. If so, return null and 
            // let the caller fill in the actual schema after all peer fields have been
            // processed.
            if (schemaTemplate.__hx_schema_type == 1002) {
                return null;
            }

            for (var schemaField in schemaTemplate) {
                if (!schemaTemplate.hasOwnProperty(schemaField)) {
                    continue;
                }
                if (Helix.DB.reservedFields[schemaField]) {
                    continue;
                } 
                var subSchema = schemaTemplate[schemaField];
                if (Object.prototype.toString.call(subSchema) === '[object Array]') {
                    var elemSchema = this.generatePersistenceFields(subSchema[0],schemaField,allVisited,recursiveFields,allSchemas);
                    if (elemSchema != null) {
                        subSchemas[schemaField] = elemSchema;
                        oneToMany.push({
                            "field" : schemaField, 
                            "table" : elemSchema.__hx_schema_name
                        });
                    } else {
                        myRecursiveFields.push({
                            'schemaName': subSchema[0].__hx_schema_name, 
                            'field' : schemaField, 
                            'oneToMany' : true
                        });
                    }
                } else if (Object.prototype.toString.call(subSchema) === '[object Object]') {
                    // This is a dependent object, which we assume is stored in another field.
                    var fieldSchema = this.generatePersistenceFields(subSchema,schemaField,allVisited,recursiveFields,allSchemas);
                    if (fieldSchema != null) {
                        subSchemas[schemaField] = fieldSchema;
                        manyToOne.push({
                            "field" : schemaField, 
                            "table" : fieldSchema.__hx_schema_name
                        });
                    } else {
                        myRecursiveFields.push({
                            'schemaName' : subSchema.__hx_schema_name, 
                            'field' : schemaField, 
                            'oneToMany' : false
                        });
                    }
                } else {
                    // Otherwise this is a scalar type and we handle all scalar types here mapping them
                    // to SQLite data types. For now we don't support blob, but should add support
                    // using HTML5's new support for binary data.
                    if (Object.prototype.toString.call(subSchema) === '[object Date]') {
                        schemaFields[schemaField] = "DATE";
                    } else if (Object.prototype.toString.call(subSchema) === '[object Boolean]') {
                        schemaFields[schemaField] = "BOOL";
                    } else if (Object.prototype.toString.call(subSchema) === '[object String]') {
                        schemaFields[schemaField] = "TEXT";
                    } else if (Object.prototype.toString.call(subSchema) === '[object Number]') {
                        if (Helix.DB.Utils.isInt(subSchema)) {
                            schemaFields[schemaField] = "INT";
                        } else {
                            schemaFields[schemaField] = "REAL";
                        }
                    }
                }
            }
            // Create the persistence schema.
            var objSchema = persistence.define(schemaTemplate.__hx_schema_name, schemaFields, true);
            objSchema.__hx_schema_name = schemaTemplate.__hx_schema_name;
            objSchema.__hx_sorts = schemaTemplate.__hx_sorts;
            objSchema.__hx_filters = schemaTemplate.__hx_filters;
            objSchema.__hx_global_filters = schemaTemplate.__hx_global_filters;

            objSchema.index(schemaTemplate.__hx_key, {
                unique: true
            });
            objSchema.__hx_key = schemaTemplate.__hx_key;
        
            objSchema.__pm_subSchemas = subSchemas;

            // Save a reference to the schema.
            window.__pmAllSchemas[schemaTemplate.__hx_schema_name] = objSchema;

            // Save the schemaFields and the relationships in the allSchemas array
            allSchemas.push({
                'schema': objSchema,
                'fields' : schemaFields,
                'keyField' : schemaTemplate.__hx_key,
                'sortFields' : schemaTemplate.__hx_sorts,
                'filterFields' : schemaTemplate.__hx_filters,
                'globalFilterFields' : schemaTemplate.__hx_global_filters,
                'textIndexFields' : schemaTemplate.__hx_text_index
            });

            // Insert all of the sub schemas.
            var i = 0;

            // Save off our forward references in the global list.
            var recurseIdx;
            for (recurseIdx = 0; recurseIdx < myRecursiveFields.length; ++recurseIdx) {
                var forwardRefObj = myRecursiveFields[recurseIdx];
                recursiveFields.push({
                    'schemaName' : forwardRefObj.schemaName, 
                    'field' : forwardRefObj.field,
                    'name' : name,
                    'schema' : objSchema,
                    'oneToMany' : forwardRefObj.oneToMany
                });
            }

            // 1-many - i.e. this object has an array of these things.
            for (i = 0; i < oneToMany.length; ++i) {
                var oneToManyField = oneToMany[i].field;
                objSchema.hasMany(oneToManyField, subSchemas[oneToManyField], name);
            }
            // Many-to-1 - i.e. this object references an object that may be shared
            // with other objects.
            for (i = 0; i < manyToOne.length; ++i) {
                var manyToOneField = manyToOne[i].field;
                objSchema.hasOne(manyToOneField, subSchemas[manyToOneField]);
            }

            if (schemaTemplate.__hx_sorts) {
                for (var sortField in schemaTemplate.__hx_sorts) {
                    objSchema.index(sortField);
                }
            }
        
            if (schemaTemplate.__hx_filters) {
                for (var filterField in schemaTemplate.__hx_filters) {
                    if (!schemaTemplate.__hx_sorts[filterField]) {
                        objSchema.index(filterField);
                    }
                }
            }
            
            if (schemaTemplate.__hx_global_filters) {
                for (var gFilterField in schemaTemplate.__hx_global_filters) {
                    if (!schemaTemplate.__hx_sorts[gFilterField] &&
                        !schemaTemplate.__hx_filters[gFilterField]) {
                        objSchema.index(gFilterField);
                    }
                }
            }
            
            if (schemaTemplate.__hx_text_index) {
                for (i = 0; i < schemaTemplate.__hx_text_index.length; i++) {
                    var indexField = schemaTemplate.__hx_text_index[i];
                    objSchema.textIndex(indexField);
                }
            }
            return objSchema;
        },

        generatePersistenceSchema: function(schemaTemplate,name,oncomplete,opaque,nRetries) {
            if (!Helix.DB.persistenceIsReady()) {
                $(document).on('hxPersistenceReady', function() {
                    Helix.DB.generatePersistenceSchema(schemaTemplate,name,oncomplete,opaque,nRetries+1);
                });
                return;
            }
        
            // Generate the schema from the supplied schema template and synchronize it with the 
            // database. Returned the generated schema.    
            var s;
            var recursiveFields = [];
            var allSchemas = [];

            if (!window.__pmAllSchemas) {
                window.__pmAllSchemas = {};
            }
            /* First, check to see if the schema was created in a recursive call. */
            if (this.createdSchemas[name]) {
                // We have already created all schemas associated with this widget.
                var oncompleteArgs = [ this.createdSchemas[name] ];
                oncompleteArgs = oncompleteArgs.concat(opaque);
                oncomplete.apply(this, oncompleteArgs);
                return;
            }
            /* Next, check to see if this specific schema is already available from a previous call to
             * generatePersistenceSchema. 
             */
            var schemaNameToCheck;
            if (Object.prototype.toString.call(schemaTemplate) === '[object Array]') {
                schemaNameToCheck = schemaTemplate[0].__hx_schema_name;
            } else {
                schemaNameToCheck = schemaTemplate.__hx_schema_name;
            }
        
            if (window.__pmAllSchemas[schemaNameToCheck]) {
                // We have already created all schemas associated with this widget.
                oncompleteArgs = [ window.__pmAllSchemas[schemaNameToCheck] ];
                oncompleteArgs = oncompleteArgs.concat(opaque);
                oncomplete.apply(this, oncompleteArgs);
                return;
            }
        

            if (Object.prototype.toString.call(schemaTemplate) === '[object Array]') {
                // The template provided references a list of table rows. The schema is
                // the individual table rows.
                s = this.generatePersistenceFields(schemaTemplate[0],name,{},recursiveFields,allSchemas);
            } else {
                // The template provided references a single table row.
                s = this.generatePersistenceFields(schemaTemplate,name,{},recursiveFields,allSchemas);   
            }

            // Recurse over all recursive fields and patch them back into subschemas.
            var recurseIdx;
            for (recurseIdx = 0; recurseIdx < recursiveFields.length; ++recurseIdx) {
                var recurseElem = recursiveFields[recurseIdx];
                var recurseSchema = recurseElem.schema.__pm_subSchemas[recurseElem.field] = window.__pmAllSchemas[recurseElem.schemaName];
                if (recurseElem.oneToMany) {
                    recurseElem.schema.hasMany(recurseElem.field, recurseSchema, recurseElem.name);
                } else {
                    recurseSchema.hasMany(recurseElem.name, recurseElem.schema, recurseElem.field);
                }
            }
        
            // Determine if any upgrades need to be generated. The required SQL commands
            // are stored as schema sync hooks.
            var dirty = false;
            if (Helix.DB.doMigrations(name,allSchemas)) {
                dirty = true;
            }
            
            // Flush all schemas.
            persistence.schemaSync(function(tx) {
                // Flush all master DB changes.
                persistence.flush(function() {
                    if (dirty) {
                        // Clean out Persistence JS' cache of all tracked objects and cached
                        // query collections. Otherwise we can end up with stale objects/queries
                        // that refer to a field list that is out of sync with the flushed schema
                        // changes that we just completed. NOTE that everything we do here should
                        // happen before we are manipulating data from a particular table.
                        persistence.clean();
                    }
                    
                    var oncompleteArgs = [ s ];
                    oncompleteArgs = oncompleteArgs.concat(opaque);
                    oncomplete.apply(this, oncompleteArgs);

                    // Launch async indexing ... these calls do nothing if there are
                    // no fields to index or if async indexing is not enabled.
                    /*for (var schemaName in window.__pmAllSchemas) { 
                        var indexSchema = window.__pmAllSchemas[schemaName];
                        indexSchema.indexAsync(0, Helix.DB.indexFull);
                    }*/
                });
            });
        
            // We are done with this schema ...
            this.createdSchemas[name] = s;
        },

        doAppMigrations: function(tableName, migrationOptions) {
            Helix.DB.defineTableMigration(Helix.DB.__schemaVersion,
                        tableName, 
                        migrationOptions.newFields, 
                        migrationOptions.oldFields, 
                        (migrationOptions.newFields && migrationOptions.oldFields),
                        migrationOptions.oldIndexes, 
                        migrationOptions.newIndexes,
                        null,
                        null,
                        null, 
                        null,
                        null, 
                        null,
                        null, 
                        null);
            persistence.migrate(Helix.DB.__schemaVersion, Helix.DB.__schemaVersion + 1);
            Helix.DB.__schemaVersion = Helix.DB.__schemaVersion + 1;
        },

        doMigrations: function(metaName,allSchemas) {
            // Migrate tables one at a time.
            if (allSchemas.length == 0) {
                return false;
            }

            var dirty = false;
            for (var i = 0; i < allSchemas.length; ++i) {
                var schema = allSchemas[i];
                var tableName = schema.schema.meta.name;
                var dirtyMap = {};

                if (schema.schema.meta.textIndex) {
                    schema.schema.meta.textIndex['__hx_generated'] = false;
                }
                var curVer = Helix.DB.migrateTable(Helix.DB.__schemaVersion, schema, metaName, dirtyMap);
                if (curVer > 0) {
                    // Migrations must be done.
                    dirty = true;
                    
                    persistence.migrate(Helix.DB.__schemaVersion, curVer);
                    Helix.DB.__schemaVersion = curVer;
                    
                    // This table exists. All updates to it are handle as sync hooks.
                    persistence.generatedTables[tableName] = true;
                    
                    if (!dirtyMap['textindex']) {
                        // Do not regenerate textIndex tables.
                        if (schema.schema.meta.textIndex) {
                            schema.schema.meta.textIndex['__hx_generated'] = true;
                        }
                    }
                } else if (curVer <= 0) {
                    if (curVer == 0) {
                        // This table is already in the DB. Mark it as a generated table.
                        persistence.generatedTables[tableName] = true;
                        // Do not regenerate textIndex tables.
                        if (schema.schema.meta.textIndex) {
                            schema.schema.meta.textIndex['__hx_generated'] = true;
                        }
                    }
                }
            }
            return dirty;
        },

        migrateTable: function(oldVersion, schema, metaName, dirtyMap) {
            var tableName = schema.schema.meta.name;
            var schemaRec = window.__pmAllTables[tableName];
            if (schemaRec == null) {
                // This is a new table.
                var newSchema = new window.__pmMasterDB();
                newSchema.metaName = metaName;
                newSchema.tableVersion = 0;
                newSchema.tableName = tableName;
                newSchema.tableFields = JSON.stringify(schema.fields);
                newSchema.keyField = schema.keyField;
                newSchema.sortFields = JSON.stringify(schema.sortFields);
                newSchema.filterFields = JSON.stringify(schema.filterFields);
                newSchema.globalFilterFields = JSON.stringify(schema.globalFilterFields);
                newSchema.textIndexFields = JSON.stringify(schema.textIndexFields);

                // Convert relationships to JSON.
                newSchema.tableOneToMany = Helix.DB.convertRelationshipToString(schema.schema.meta.hasMany);
                newSchema.tableManyToOne = Helix.DB.convertRelationshipToString(schema.schema.meta.hasOne);

                persistence.add(newSchema);
                
                // New table - return -1;
                return -1;
            } else {
                var dirty = 0;
                var fieldsChanged = 0;
                var oldSorts, newSorts;
                var oldKey, newKey;
                var oldFilters, newFilters;
                var oldGlobalFilters, newGlobalFilters;
                var oldTextIndex, newTextIndex;
                var allNewFields = {};
                var allOldFields = {};

                var tf = $.parseJSON(schemaRec.tableFields);
                if (!Helix.Utils.objectsEqual(tf, schema.fields)) {
                    var fieldsString = JSON.stringify(schema.fields);
                    dirty = 1;
                    fieldsChanged = 1;
                    schemaRec.tableFields = fieldsString;
                    dirtyMap['fields'] = true;
                }
                $.extend(allOldFields, tf);
                $.extend(allNewFields, schema.fields);
                
                var manyToOneStr = Helix.DB.convertRelationshipToString(schema.schema.meta.hasOne);
                var oldManyToOne = $.parseJSON(schemaRec.tableManyToOne);
                if (manyToOneStr !== schemaRec.tableManyToOne) {
                    var allManyToOne = {};
                    $.extend(allManyToOne, oldManyToOne);
                    
                    // At this point, allManyToOne includes all old fields. We want to
                    // see if this schema sync is *adding* fields, in which case we mark
                    // the field list as dirty. We DO NOT delete many to one reference fields
                    // because we want to allow a single object type to have different parent
                    // objects in different load commands.
                    for (var newFld in schema.schema.meta.hasOne) {
                        if (!allManyToOne[newFld]) {
                            // we have a new relationship field ...
                            fieldsChanged = 1;
                            var r = schema.schema.meta.hasOne[newFld];
                            allManyToOne[newFld] = {
                                "table" : r.type.__hx_schema_name, 
                                "inverse": r.inverseProperty
                            };
                        }
                    }
                    dirty = 1;
                    
                    // XXX: for now, we never delete relationship fields. Eventually we
                    // might find a way to check and see if the table we are relating to
                    // is deleted, but first we need to invent a mechanism for table deletion.
                    manyToOneStr = JSON.stringify(allManyToOne);
                    schemaRec.tableManyToOne = manyToOneStr;
                    
                    $.extend(allNewFields, allManyToOne);
                    dirtyMap['manytoone'] = true;
                } else if (dirtyMap['fields']) {
                    // We are going to migrate all fields. Make sure we don't omit an id
                    // relationship field.    
                    $.extend(allNewFields, schema.schema.meta.hasOne);
                }
                $.extend(allOldFields, oldManyToOne);
                
                var oneToManyStr = Helix.DB.convertRelationshipToString(schema.schema.meta.hasMany);
                if (oneToManyStr !== schemaRec.tableOneToMany) {
                    dirty = 1;
                    schemaRec.tableOneToMany = oneToManyStr;
                    dirtyMap['onetomany'] = true;
                }
                
                var sortFields = JSON.stringify(schema.sortFields);
                if (sortFields !== schemaRec.sortFields) {
                    dirty = 1;
                    oldSorts = $.parseJSON(schemaRec.sortFields);
                    newSorts = schema.sortFields;
                    schemaRec.sortFields = sortFields;
                    dirtyMap['sorts'] = true;
                }
                var filterFields = JSON.stringify(schema.filterFields);
                if (filterFields !== schemaRec.filterFields) {
                    dirty = 1;
                    oldFilters = $.parseJSON(schemaRec.filterFields);
                    newFilters = schema.filterFields;
                    schemaRec.filterFields = filterFields;
                    dirtyMap['filters'] = true;
                }

                var globalFilterFields = JSON.stringify(schema.globalFilterFields);
                if (globalFilterFields !== schemaRec.globalFilterFields) {
                    dirty = 1;
                    oldGlobalFilters = $.parseJSON(schemaRec.globalFilterFields);
                    newGlobalFilters = schema.globalFilterFields;
                    schemaRec.globalFilterFields = globalFilterFields;
                    dirtyMap['globalfilters'] = true;
                }

                var textIndexFields = JSON.stringify(schema.textIndexFields);
                if (textIndexFields !== schemaRec.textIndexFields) {
                    dirty = 1;
                    oldTextIndex = $.parseJSON(schemaRec.textIndexFields);
                    newTextIndex = schema.textIndexFields;
                    schemaRec.textIndexFields = textIndexFields;
                    dirtyMap['textindex'] = true;
                }

                if (schema.keyField !== schemaRec.keyField) {
                    dirty = 1;
                    oldKey = schemaRec.keyField;
                    newKey = schema.keyField;
                    schemaRec.keyField = schema.keyField;
                    dirtyMap['key'] = true;
                }
                
                if (dirty) {
                    schemaRec.tableVersion = schemaRec.tableVersion + 1;
                    Helix.DB.defineTableMigration(oldVersion,
                        schemaRec.tableName, allNewFields, allOldFields, fieldsChanged,
                        oldSorts, newSorts,
                        oldKey, newKey,
                        oldFilters, newFilters,
                        oldGlobalFilters, newGlobalFilters,
                        oldTextIndex, newTextIndex);
                    
                    // > 0 - means we need to migrate.
                    return oldVersion + 1;
                } else {
                    // 0 means schema is unchanged.
                    return 0;
                }
            }
        },
    
        defineTableMigration: function(oldVersion,
            tableName, allNewFields, allOldFields, fieldsChanged,
            oldSorts, newSorts,
            oldKey, newKey,
            oldFilters, newFilters,
            oldGlobalFilters, newGlobalFilters,
            oldTextIndex, newTextIndex) {
            
            persistence.defineMigration(oldVersion + 1, {
                up: function() {
                    var allNewIndices = {};
                    if (fieldsChanged) {
                        this.updateColumns(allNewFields, allOldFields, tableName);              
                    }
                    if (oldSorts && newSorts) {
                        Helix.DB.migrateIndexes.call(this, tableName, oldSorts, newSorts, allNewIndices);
                    }
                    if (oldFilters && newFilters) {
                        Helix.DB.migrateIndexes.call(this, tableName, oldFilters, newFilters, allNewIndices);
                    }
                    if (oldGlobalFilters && newGlobalFilters) {
                        Helix.DB.migrateIndexes.call(this, tableName, oldGlobalFilters, newGlobalFilters, allNewIndices);
                    }
                    if (oldTextIndex && newTextIndex) {
                        Helix.DB.migrateIndexes.call(this, tableName, oldTextIndex, newTextIndex, allNewIndices);
                    }
                    if (oldKey && newKey) {
                        this.removeIndex(tableName, oldKey);
                        this.addIndex(tableName, newKey);
                    }
                    
                }
            });
        },
        
        migrateIndexes: function(tableName, oldIndexList, newIndexList, allNewIndices) {
            var fld = null;
            for (fld in oldIndexList) {
                if (!newIndexList[fld] && !allNewIndices[fld]) {
                    this.removeIndex(tableName, fld);                            
                }
            }
            for (fld in newIndexList) {
                if (oldIndexList[fld]) {
                    // Already indexed.
                    continue;
                }
                this.addIndex(tableName, fld);
                allNewIndices[fld] = true;
            }
        },

        generateSubSchemaFromDBRow: function(tableName,parentField,parentSchema,inverseField,isOneToMany,oncomplete) {
            Helix.DB.generatePersistenceSchemaFromDB(tableName, null, function(subSchema) {
                if (subSchema) {
                    if (isOneToMany) {
                        parentSchema.hasMany(parentField, subSchema, inverseField);
                    } else {
                        subSchema.hasMany(inverseField, parentSchema, parentField);
                    }
                }
                parentSchema.__pm_subSchemas[parentField] = subSchema;
                oncomplete(parentField, subSchema);
            });  
        },
    
        generatePersistenceSchemaFromDBRow: function(masterRow,oncomplete) {
            /* Generate the schema from this row. */
            var schema = persistence.define(masterRow.tableName, $.parseJSON(masterRow.tableFields) );
            /* SAH - mark this as a table that does not need to be re-created in the DB. */
            persistence.generatedTables[masterRow.tableName] = true;
            schema.index(masterRow.keyField, {
                unique: true
            });
            schema.__hx_key = masterRow.keyField;
            schema.__hx_sorts = masterRow.sortFields;
            schema.__hx_filters = masterRow.filterFields;
            schema.__hx_global_filters = masterRow.globalFilterFields;
            schema.__hx_text_indexes = masterRow.textIndexFields;
            schema.__pm_subSchemas = {};
            if (window.__pmLocalSchemas) {
                window.__pmLocalSchemas[masterRow.tableName] = schema;
            }
        
            var toSync = {};
            var done = function(field) {
                if (field) {
                    delete toSync[field];                
                }
            
                if (Object.keys(toSync).length == 0) {
                    oncomplete(schema);
                }
            };
        
        
            var indexFields = $.parseJSON(masterRow.sortFields);
            if (indexFields) {
                for (var sortField in indexFields) {
                    schema.index(sortField);
                }
            }
        
            var filterFields = $.parseJSON(masterRow.filterFields);
            if (filterFields) {
                for (var filterField in filterFields) {
                    if (!indexFields[filterField]) {
                        schema.index(filterField);
                    }
                }
            }
            
            var textIndexFields = $.parseJSON(masterRow.textIndexFields);
            for (var i = 0; i < textIndexFields.length; i++) {
                var indexField = textIndexFields[i];
                schema.textIndex(indexField);
            }
            // We read this from the DB - no need to attempt to re-generate the text index tables.
            if (schema.textIndex) {
                schema.textIndex['__hx_generated'] = true;
            }
        
            /* Recurse over any dependent tables for which we don't have schema. */
            var field;
        
            /* Track all of the fields we need to sync so that we don't call the completion
         * until we are truly done.
         */
            var manyToOnes = $.parseJSON(masterRow.tableManyToOne);
            if (manyToOnes) {
                for (field in manyToOnes) {
                    toSync[field] = true;
                }
            }
            var oneToManys = $.parseJSON(masterRow.tableOneToMany);
            if (oneToManys) {
                for (field in oneToManys) {
                    toSync[field] = true;
                }
            }
        
            if (Object.keys(toSync).length == 0) {
                done(null);
                return;
            }
        
            if (manyToOnes) {
                for (field in manyToOnes) {
                    Helix.DB.generateSubSchemaFromDBRow(manyToOnes[field].table,
                        field,
                        schema,
                        manyToOnes[field].inverse,
                        false,
                        done);
                }
            }        
        
            if (oneToManys) {
                for (field in oneToManys) {
                    Helix.DB.generateSubSchemaFromDBRow(oneToManys[field].table,
                        field,
                        schema,
                        oneToManys[field].inverse,
                        true,
                        done);
                }
            }
        },

        /**
     * Generates schema for the given name, including all dependent schemas. This
     * function is intended to be called when the local client is trying to access
     * a schema that is generally synchronized from the server. The most common
     * case is to do this when the client is offline, however one might also do this
     * for data that is accessed locally prior to contacting the server or for data
     * that is only stored locally.
     * 
     * @param schemaName Name of the table (schema) we are generating
     * @param schemaTemplate Template object; this is optional, and is generally useful
     *      for schemas that are never synchronized from the server.
     * @param oncomplete This function is asynchronous; this function is called upon completion.
     * @param nRetries Internal parameter - do not pass a value.
     */
        generatePersistenceSchemaFromDB: function(schemaName,schemaTemplate,oncomplete,nRetries) {
            if (!window.__pmMasterDB) {
                throw "You must call initPersistence prior to calling this routine!";
            }
            
            var __continuation = function() {
                /* First, check to see if the schema is already available. */
                if (window.__pmLocalSchemas) {
                    if (window.__pmLocalSchemas[schemaName]) {
                        oncomplete(window.__pmLocalSchemas[schemaName]);
                        return;
                    }
                } else {
                    window.__pmLocalSchemas = {};
                }

                /* If we have a template, just generate the schema from that template. Otherwise
                 * we either (a) read the schema from the DB, or (b) return null because the schema
                 * does not exist.
                 */
                if (schemaTemplate) {
                    Helix.DB.generatePersistenceSchema(schemaTemplate,schemaName,oncomplete);
                } else {
                    /* Next, lookup this schema in the master DB and generate the schema
                     * from the DB. 
                     */
                    var masterRow = window.__pmAllTables[schemaName];
                    if (masterRow) {
                        Helix.DB.generatePersistenceSchemaFromDBRow(masterRow,function(schema) {
                            // This table is already in the DB. No need to call schemaSync.
                            oncomplete(schema);
                        });
                    } else {
                        oncomplete(null);
                    }
                }
            };
            
            if (!Helix.DB.persistenceIsReady()) {
                $(document).on('hxPersistenceReady', function() {
                    __continuation();
                });
            } else {
                __continuation();
            }    
        },


        prepareSchemaTemplate: function(templateObj, tableName, keyField, sorts, filters) {
            templateObj.__hx_schema_name = tableName;
            templateObj.__hx_key = keyField;
            templateObj.__hx_sorts = sorts;
            templateObj.__hx_filters = filters;

            return templateObj;
        },

        convertRelationshipToString: function(relObject) {
            var f, r;
            var relSummary = {};
            if (relObject) {
                for (f in relObject) {
                    r = relObject[f];
                    relSummary[f] = {
                        "table" : r.type.__hx_schema_name, 
                        "inverse": r.inverseProperty
                    };
                }
            }
            return JSON.stringify(relSummary);
        },

        /**
     * Extract the key field from the schema.
     */
        getKeyField: function(schema) {
            return schema.__hx_key
        },
    
        getSchemaForObject: function(obj) {
            return obj.__hx_schema;
        },
        
        getSchemaNameForObject : function(obj) {
            if (Object.prototype.toString.call(obj) === '[object Array]') {
                if (obj.length > 0) {
                    return Helix.DB.getSchemaNameForObject(obj[0]);
                } else {
                    return null;
                }
            }
            return obj.__hx_schema.__hx_schema_name;
        },
    
        getSortsForTable: function(tableName) {
            if (!window.__pmAllSchemas) {
                return null;
            }
        
            var schema = window.__pmAllSchemas[tableName];
            return schema.__hx_sorts;
        },
    
        getFiltersForTable: function(tableName) {
            if (!window.__pmAllSchemas) {
                return null;
            }
        
            var schema = window.__pmAllSchemas[tableName];
            return schema.__hx_filters;
        },
        
        getGlobalFiltersForTable: function(tableName) {
            if (!window.__pmAllSchemas) {
                return null;
            }
        
            var schema = window.__pmAllSchemas[tableName];
            return schema.__hx_global_filters;
        },

        getSchemaForTable: function(tableName) {
            if (!window.__pmAllSchemas) {
                return null;
            }
        
            var schema = window.__pmAllSchemas[tableName];
            return schema;
        },

        getSchemaNameForField: function(persistentObj, fieldName) {
            if (fieldName in persistentObj.__hx_schema.__pm_subSchemas) {
                return persistentObj.__hx_schema.__pm_subSchemas[fieldName].__hx_schema_name;
            }
            return null;
        },
        
        getSchemaForField: function(persistentObj, fieldName) {
            if (fieldName in persistentObj.__hx_schema.__pm_subSchemas) {
                return persistentObj.__hx_schema.__pm_subSchemas[fieldName];
            }
            return null;
        },
    
        createSchemaForTable: function(tableName, fields, indices) {
            var newSchema = persistence.define(tableName, fields);
            window.__pmAllSchemas[tableName] = newSchema;
            var i = 0;
            if (indices) {
                for (i = 0; i < indices.length; ++i) {
                    newSchema.index(indices[i]);
                }            
            }
            return newSchema;
        },
    
        /**
         * Data synchronization routines.
         */
    
        cascadingRemoveQueryCollection: function(queryCollection, oncomplete, overrides) {
            var toDelete = [];
            var cascade = function() {
                if (toDelete.length == 0) {
                    oncomplete();
                    return;
                }
                
                var elem = toDelete.pop();
                Helix.DB.cascadingRemove(elem, function() {
                    queryCollection.remove(elem);
                    persistence.remove(elem);
                    if (overrides.deleteHook) {
                        overrides.deleteHook(elem);
                    }
                    cascade();
                }, overrides);
            };
        
            
            queryCollection.newEach({
                eachFn: function(elem) {
                    toDelete.push(elem);
                },
                doneFn: function(ct) {
                    cascade();
                }
            });
        },
    
        cascadingRemove: function(persistentObj, oncomplete, overrides) {
            var toCascade = [];
            var recurseDown = function() {
                if (toCascade.length == 0) {
                    //persistence.remove(persistentObj);
                    oncomplete(persistentObj, "remove");
                    return;
                }
                
                var nxt = toCascade.pop();
                if (nxt.forEach) {
                    // Query collection.
                    Helix.DB.cascadingRemoveQueryCollection(nxt, recurseDown, overrides);
                } else {
                    Helix.DB.cascadingRemove(nxt, recurseDown, overrides);
                }
            };
            
            // First, save off the objects we need to delete recursively. When we are done, we call
            // recurseDown above.
            var fields = Object.keys(persistentObj._data).slice(0);
            var collect = function() {
                if (fields.length == 0) {
                    recurseDown();
                    return;
                }
                
                var fld = fields.pop();
                if (!persistentObj.hasOwnProperty(fld)) {
                    collect();
                    return;
                }
                
                try {
                    var getter = Object.getOwnPropertyDescriptor(persistentObj, fld).get;
                    var subObj = getter();
                    if (subObj && subObj.forEach) {
                        toCascade.push(subObj);
                    }
                    collect();
                } catch(err) {
                    persistentObj.fetch(fld, function(obj) {
                        // This is a one-to-one relationship with an object.
                        if (obj) {
                            toCascade.push(obj);
                        }
                        collect();
                    });
                }
            };
            // Start the recursion.
            collect();
        },
    
        addObjectToQueryCollection: function(allSchemas,
            obj,
            elemSchema, 
            queryCollection, 
            overrides,
            oncomplete,
            opaque) {
            Helix.DB.synchronizeObjectFields(allSchemas, obj, null, elemSchema, function(finalObj) {
                queryCollection.add(finalObj);
                oncomplete(opaque);
            }, overrides);
        },
    
        synchronizeQueryCollection: function(allSchemas,
            newObjectMap, 
            parentCollection,
            compareCollection,
            elemSchema, 
            keyFieldName, 
            oncomplete, 
            oncompleteArg,
            overrides) {


            var syncObjs = [];
            var deleteObjs = [];
            var addObjs = [];
            compareCollection.newEach({
                eachFn: function(qryElem) {
                    var qryElemKeyValue = qryElem[keyFieldName];
                    if (newObjectMap[qryElemKeyValue]) {
                        /* The query collection has an object with the same key as an object
                         * in the newObjectMap. Synchronize fields and remove from the map.
                         */
                        var newObj = newObjectMap[qryElemKeyValue];
                        delete newObjectMap[qryElemKeyValue];
                        syncObjs.push({  
                            'newObj' : newObj,
                            'oldObj' : qryElem
                        });
                    } else {
                        /* The query collection has an object that is not in the newObjectMap. Remove it.
                         * We don't proceed until this is done, because otherwise other points in the
                         * sync may pick up stale objects.
                         */
                        deleteObjs.push(qryElem);
                    }
                },
                doneFn: function() {
                    /* Called when the iteration over the query collection is done. */

                    /* First compile the list of objects remaining in the newObjectMap that we
                     * are going to add.
                     */
                    for (var k in newObjectMap) {
                        addObjs.push(newObjectMap[k]);
                    }

                    var doAdds = function() {
                        if (addObjs.length > 0) {
                            var toAdd = addObjs.pop();
                            Helix.DB.addObjectToQueryCollection(allSchemas, toAdd, elemSchema, parentCollection, overrides, doAdds);
                        } else {
                            oncomplete(oncompleteArg);
                        }
                    };

                    var removeFn = function(persistentObj) {
                        if (persistentObj) {
                            parentCollection.remove(persistentObj);
                            persistence.remove(persistentObj);
                            if (overrides.deleteHook) {
                                overrides.deleteHook(persistentObj);
                            }
                        }

                        if (deleteObjs.length > 0) {
                            var toDelete = deleteObjs.pop();
                            Helix.DB.cascadingRemove(toDelete,removeFn,overrides);
                        } else {
                            /* Nothing more to remove. Add in any new objects. */
                            doAdds();
                        }
                    };

                    var syncFn = function() {
                        if (syncObjs.length > 0) {
                            var toSync = syncObjs.pop();
                            Helix.DB.synchronizeObjectFields(allSchemas, toSync.newObj, toSync.oldObj, elemSchema, syncFn, overrides);
                        } else {
                            /* Nothing more to sync. Do all removes. */
                            removeFn();
                        }
                    };

                    syncFn();
                }
            });
        },

        synchronizeArrayField: function(allSchemas, objArray, parentCollection, elemSchema, field, oncomplete, overrides) {
            /* Synchronize the query collection. First, we create a map from keys to objects
             * from the new objects in obj[arrLocalField].
             */
            var elemKeyField = Helix.DB.getKeyField(elemSchema);
            var elemMap = {};
            
            for (var i = 0; i < objArray.length; ++i) {
                var curElem = objArray[i];
                elemMap[curElem[elemKeyField]] = curElem;
            }
        
            /* Refine the query collection using a user-configured call. By default this is
             * an identity call (i.e, it just returns parentCollection). However, in some
             * cases the user knows that a load only loaded a subset of a data list from
             * the server. This call is used to refine the list for comparison.
             */
            var comparisonCollection = overrides.refineEntityArray(field, parentCollection);
        
            /* Now sync the query collection against the elemMap. NOTE: delta objects are the more
             * efficient way to do this!
             */
            Helix.DB.synchronizeQueryCollection(allSchemas, elemMap, parentCollection, comparisonCollection, elemSchema, elemKeyField, oncomplete, field, overrides);
        },
    
        updateOneObject: function(allSchemas, updatedObj, keyField, toUpdateKey, elemSchema, oncomplete, overrides) {
            elemSchema.findBy(keyField, toUpdateKey, function(toUpdateObj) {
                Helix.DB.synchronizeObjectFields(allSchemas, updatedObj,toUpdateObj,elemSchema,function(newObj) {
                    if (overrides.updateHook) {
                        overrides.updateHook(newObj);
                    }
                    oncomplete(newObj);
                }, overrides);
            });
        },
    
        synchronizeDeltaField: function(allSchemas, deltaObj, parentCollection, elemSchema, field, oncomplete, overrides) {
            var keyField = this.getKeyField(elemSchema);

            var nToAdd = deltaObj.adds.length;
            var nAddsDone = 0;
            var addDone = function(pObj) {
                ++nAddsDone;
                if (nAddsDone == nToAdd) {
                    /* Nothing more to add - we are done. */
                    oncomplete(field);
                }
            };

            var doAdds = function(uidToEID) {
                if (deltaObj.adds.length == 0) {
                    oncomplete(field);
                } else {
                    while (deltaObj.adds.length > 0) {
                        var toAdd = deltaObj.adds.pop();
                        var toAddKey = toAdd[keyField];

                        var objId = uidToEID[toAddKey];
                        if (objId) {
                            Helix.DB.updateOneObject(allSchemas,toAdd,keyField,toAddKey,elemSchema,function(pObj) {
                                parentCollection.add(pObj);
                                addDone(pObj);
                            },overrides);
                        } else {
                            Helix.DB.addObjectToQueryCollection(allSchemas,toAdd,elemSchema, parentCollection,overrides,addDone,uidToEID);
                        }                        
                    }                                     
                }
            };
            
            var createUIDToEIDMap = function(startIdx, addUniqueIDs, uidToEID) {
                var toProcess = addUniqueIDs.slice(startIdx, 100);
                //elemSchema.all().filter(keyField, 'in', toProcess).newEach(tx, {
                elemSchema.all().newEach({    
                    eachFn: function(elem) {
                        uidToEID[elem[keyField]] = elem.id;
                    }, 
                    doneFn: function(ct) {
                        doAdds(uidToEID);
                        /*if (ct == 0) {
                            doAdds(uidToEID);
                        } else {
                            createUIDToEIDMap(startIdx + 100, addUniqueIDs, uidToEID);
                        }*/
                    }
                })
            };
            
            var prepareAdds = function() {
                var addUniqueIDs = [];
                for (var i = 0; i < deltaObj.adds.length; ++i) {
                    addUniqueIDs.push(deltaObj.adds[i][keyField]);
                }
                var uidToEID = {};
                createUIDToEIDMap(0, addUniqueIDs, uidToEID);
            };

            var removeFn = function(persistentObj) {
                if (persistentObj) {
                    parentCollection.remove(persistentObj);
                    persistence.remove(persistentObj);
                    if (overrides.deleteHook){
                        overrides.deleteHook(persistentObj);
                    }
                }

                if (deltaObj.deletes.length > 0) {
                    var toDeleteKey = deltaObj.deletes.pop();
                    parentCollection.filter(keyField, "=", toDeleteKey).newEach({
                        eachFn: function(elem) { 
                            if (elem) {
                                Helix.DB.cascadingRemove(elem,removeFn,overrides);
                            }
                        },
                        startFn: function(ct) {
                            if (ct == 0) {
                                removeFn();
                            }
                        }
                    });
                } else {
                    /* Nothing more to remove. Add in any new objects. */
                    prepareAdds();
                }
            };

            var syncFn = function() {
                if (deltaObj.updates.length > 0) {
                    var updatedObj = deltaObj.updates.pop();
                    var toUpdateKey = updatedObj[keyField];
                    Helix.DB.updateOneObject(allSchemas,updatedObj,keyField,toUpdateKey,elemSchema,syncFn,overrides);                    
                } else {
                    /* Nothing more to sync. Do all removes. */
                    removeFn();
                }
            };

            /* Handle modifications first. */
            syncFn();
        },
    
        synchronizeDeltaObject: function(allSchemas, deltaObj, parentCollection, elemSchema, oncomplete, overrides) {
            Helix.DB.synchronizeDeltaField(allSchemas, deltaObj, parentCollection, elemSchema, null, function() {
                oncomplete(parentCollection);
            }, overrides);
        },
    
        synchronizeObjectField: function(allSchemas, obj, persistentObj, objSchema, field, keyField, oncomplete, overrides) {
            // Update the old object (if it exists) or add the new with a recursive call.
            var objLocalField = field;
            var setter = Object.getOwnPropertyDescriptor(persistentObj, objLocalField).set;
            objSchema.findBy(keyField, obj[keyField], function(dbObj) {
                Helix.DB.synchronizeObjectFields(allSchemas, obj,dbObj,objSchema,function(newObj) {
                    setter(newObj);
                    oncomplete(objLocalField);
                }, overrides);
            });
        },

        /**
         * Synchronizes the object fields against either (a) a fresh object, or (b) a 
         * populated object read from the database.
         */
        synchronizeObjectFields: function(allSchemas, obj, persistentObj, objSchema, oncomplete, overrides) {
            /* First determine what fields we will need to handle asynchronously. We are going
             * to execute a recursive descent algorithm, going into sub-arrays and sub-objects of
             * obj and synchronizing them before we synchronize obj itself. The reason is that
             * when we update persistentObj (or create it) the persistence mechanism marks that
             * object as dirty. If a sub-array sync operation triggers a flush to the DB (which it does)
             * then we will asynchronously execute many simultaneous flushes of the same object. This
             * causes a lot of extra DB churn and it will over-populate the full text index.
             */
            var asyncFields = [];
            var scalarFields = [];
            allSchemas[objSchema.__hx_schema_name] = objSchema;
            for (var field in obj) {
                if (!obj.hasOwnProperty(field)) {
                    continue;
                }
                if (field in Helix.DB.reservedFields) {
                    continue;
                }
                if (Object.prototype.toString.call(obj[field]) === '[object Array]' ||
                    Object.prototype.toString.call(obj[field]) === '[object Object]') {
                    asyncFields.push(field);    
                } else {
                    scalarFields.push(field);
                }
            }
            
            if (!persistentObj) {
                persistentObj = new objSchema();
                persistence.add(persistentObj);        
            }
            persistentObj.__hx_schema = objSchema;
            persistentObj.__hx_key = obj[this.getKeyField(objSchema)];
            
            /* Now synchronize all scalar fields (i.e. non-object, non-array) to ensure that we don't 
             * make a bunch of objects dirty and flush them over and over again as
             * we recurse through their children. We make all non-relation changes before
             * we do anything that might trigger a flush.
             */
            while (scalarFields.length > 0) {
                field = scalarFields.pop();
                /* Use the setter to make sure the object is marked as dirty appropriately. */
                var setter = Object.getOwnPropertyDescriptor(persistentObj, field).set;
                if (!overrides.syncFields(setter, obj, field, persistentObj)) {
                    setter(obj[field]);
                }
            }
            
            /* Called when an asynchronous relationship field is done sync'ing. */
            var syncDone = function() {
                if (overrides.addHook) {
                    overrides.addHook(persistentObj);
                }
                
                oncomplete(persistentObj);
            };
            
            /* Now handle relationship fields. We must handle them ONE at a time. Otherwise we get multiple asynchronous
             * calls to persistence.flush which stomp all over each other ...
             */
            var handleAsyncFields = function() {
                /* See if we are done. */
                if (asyncFields.length == 0) {
                    syncDone();
                    return;
                }
                
                var field = asyncFields.pop();
                var fieldSchema = objSchema.__pm_subSchemas[field];
                var fieldVal = obj[field];
                if (Object.prototype.toString.call(fieldVal) === '[object Array]') {
                    /* Synchronize the array field - since this is not a delta object, we assume the returned
                     * object has all fields that should be in this data table.
                     */
                    Helix.DB.synchronizeArrayField(allSchemas, fieldVal, persistentObj[field], fieldSchema, field, handleAsyncFields, overrides);
                } else if (Object.prototype.toString.call(fieldVal) === '[object Object]') {
                    if (fieldVal.__hx_type == 1001) {
                        Helix.DB.synchronizeDeltaField(allSchemas, fieldVal, persistentObj[field], fieldSchema, field, handleAsyncFields, overrides);                 
                    } else {
                        var keyField = Helix.DB.getKeyField(fieldSchema);
                        Helix.DB.synchronizeObjectField(allSchemas, fieldVal, persistentObj, fieldSchema, field, keyField, handleAsyncFields, overrides); 
                    }      
                }                
            };
            
            /* Handle all asynchronous fields. */
            handleAsyncFields();
        },

        synchronizeArray: function(allSchemas, obj,objSchema,persistentObj,callback,overrides) {
            Helix.DB.synchronizeArrayField(allSchemas, obj, persistentObj, objSchema, null, function() {
                callback(persistentObj);
            }, overrides);
        },

        /**
         * Call this function to synchronize an object to the database after loading that
         * object from the remote server. This function first queries the database using the 
         * object's key field to see if it exists. If so, it updates the old object to 
         * match the new one. If not, it simply converts the object into a persistent object 
         * and flushes it to the DB. Invoke the callback on completion.
         */
        synchronizeObject: function(obj,objSchema,callback,opaque,overrides) {
            var allSchemas = {};
            var syncDone = function(finalObj, opaque) {
                /* Store the schema in the final obj. */
                finalObj.__hx_schema = objSchema;
            
                /* We get here when the synchronize is done. */
                persistence.flush(function() {
                    /* This will either send an object to the callback. */
                    callback(finalObj,opaque);
                    
                    /* Again launch async indexing. If indexing is already in progress or there
                     * is nothing to do, then this will do nothing.
                     */
                    // Launch async indexing ... these calls do nothing if there are
                    // no fields to index or if async indexing is not enabled.
                    for (var schemaName in allSchemas) { 
                        var indexSchema = allSchemas[schemaName];
                        indexSchema.indexAsync(0, Helix.DB.indexFull);
                    }
                });
            };
        
            /* Check the overrides. IF we do not have overrides for the field sync then
             * install the default.
             */
            if (!overrides) {
                overrides = {};
            }
            if (!overrides.syncFields) {
                overrides.syncFields = Helix.DB.Utils.defaultFieldSync;
            }
            if (!overrides.refineEntityArray) {
                overrides.refineEntityArray = Helix.DB.Utils.identityRefineEntityArray;
            }
            
            if (Object.prototype.toString.call(obj) === '[object Array]') {
                Helix.DB.synchronizeArray(allSchemas, obj,objSchema,objSchema.all(),function(finalObj) {
                    syncDone(finalObj, opaque);
                },overrides);
            } else if (obj.__hx_type == 1001) {
                Helix.DB.synchronizeDeltaObject(allSchemas, obj,objSchema.all(),objSchema,function(finalObj) {
                    syncDone(finalObj, opaque);
                },overrides);
            } else if (obj.__hx_type == 1003) {
                // This is an aggregate load command. Each object field represents a distinct object that
                // should be synchronized independently of the others.
                var toSync = Object.keys(obj).slice(0);
                var resultObj = {};
                
                /* Serialize synchronization of each component so that we never have >1 flush in progress. */
                var syncComponent = function() {
                    if (toSync.length == 0) {
                        syncDone(resultObj, opaque);
                        return;
                    }
                    
                    var nxt = toSync.pop();
                    if (nxt == "__hx_type") {
                        syncComponent();
                        return;
                    }
                    var loadCommandConfig = overrides.schemaMap[nxt];
                    Helix.DB.synchronizeObject(obj[nxt], loadCommandConfig.schema, function(finalObj, objName) {
                        resultObj[objName] = finalObj;
                        syncComponent();
                    }, nxt, loadCommandConfig.syncOverrides);
                };
                syncComponent();
            } else {
                var keyField = Helix.DB.getKeyField(objSchema);
                objSchema.findBy(keyField, obj[keyField], function(persistentObj) {
                    Helix.DB.synchronizeObjectFields(allSchemas, obj, persistentObj, objSchema, function(finalObj) {
                        syncDone(finalObj, opaque);
                    }, overrides);
                });
            }            
        },

        /**
     * In this case there is no new data to synchronize. We are really just pulling
     * an object from the database and handing it back to the caller.
     */
        synchronizeObjectByKey: function(key,objSchema,callback) {
            var loadDone = function(persistentObj) {
                if (persistentObj) {
                    persistentObj.__hx_schema = objSchema;
                }
                callback(persistentObj);
            };
            var keyField = this.getKeyField(objSchema);
            objSchema.findBy(keyField, key, loadDone);
        },

        loadAllObjects: function(objSchema, callback) {
            var persistentObjs = objSchema.all();
            callback(persistentObjs);
        },

        /**
     * Called when this file is loaded. Creates the master table, which is used
     * to store the schemas of all other tables. The master schemas has a very simple
     * format - it is a 4 column table with the table name, the JSON for table fields,
     * the JSON for oneToMany relationships, and the JSON for manyToOne relationships.
     * The metaName is used to generate which loadCommand triggered this DB create.
     * 
     * We use this to check the schema for updates. If an update has occurred then
     * we run the update statements directly against the DB.
     */
        pmCreateMasterTable: function () {
            window.__pmMasterDB = persistence.define('MasterDB',{
                metaName : "TEXT",
                tableVersion: "INT",
                tableName: "TEXT",
                tableFields: "TEXT",
                keyField: "TEXT",
                sortFields: "TEXT",
                filterFields: "TEXT",
                globalFilterFields: "TEXT",
                textIndexFields: "TEXT",
                tableOneToMany: "TEXT",
                tableManyToOne: "TEXT",
                masterDBVer: "INT"
            });
            window.__pmMasterDB.index('tableName', {
                unique: true
            });
            
            var allTables = {};
            var masterDBVer = 0;
            persistence.schemaSync(function(tx) {
                window.__pmMasterDB.all().newEach({
                    eachFn: function(elem) {
                        if (elem.masterDBVer) {
                            masterDBVer = elem.masterDBVer;
                        }
                        
                        allTables[elem.tableName] = elem;
                    }, 
                    doneFn: function(ct) {
                        var dirty = 0;
                        if (masterDBVer == 0 && ct > 0) {
                            dirty = 1;
                            persistence.schemaSyncHooks.push(function() {
                                var queries = [];
                                queries.push(["ALTER TABLE MasterDB ADD COLUMN masterDBVer TEXT" , null]);
                                queries.push(["ALTER TABLE MasterDB ADD COLUMN textIndexFields TEXT" , null]);
                                return queries.reverse();
                            });
                        }
                        if (masterDBVer != Helix.DB.__masterDBVer) {
                            dirty = 1;
                            persistence.nextSchemaSyncHooks.push(function() {
                                var queries = [];
                                queries.push(["UPDATE MasterDB SET masterDBVer=?", [ Helix.DB.__masterDBVer ]]);
                                return queries;
                            });
                        }
                        
                        if (dirty) {
                            persistence.schemaSync(function() {
                                window.__persistenceReady = true;
                                window.__pmAllTables = allTables;
                                $(document).trigger('hxPersistenceReady');
                            });
                        } else {
                            window.__persistenceReady = true;
                            window.__pmAllTables = allTables;
                            $(document).trigger('hxPersistenceReady');
                        }
                    }
                })
            });
        },
    
        initPersistence: function () {
            window.__persistenceReady = false;
            
            /* Initialize PersistenceJS for use with WebSQL. Eventually need to add IndexedDB support. */
            persistence.store.websql.config(persistence, 'OfflineAppDB', 'Managed offline DB for app.', 5 * 1024 * 1024);
            
            /* Initialize PersistenceJS searching. */
            persistence.search.config(persistence, persistence.store.websql.sqliteDialect, {
                indexAsync : true
            });

            /* Keep a master list of all widget schemas we have attempted to create. This ensures we
             * don't recreate the schema each time we run a load command.
             */
            this.createdSchemas = {};

            /* Initialize PersistenceJS migrations. */
            persistence.transaction(function(tx) {
                persistence.migrations.init(tx, function() {
                    persistence.migrations.Migrator.version(tx, function(schemaVer) {
                        Helix.DB.__schemaVersion = schemaVer;
                        Helix.DB.pmCreateMasterTable();
                    });
                });
            });
        },
    
        persistenceIsReady: function() {
            if (!window.__persistenceReady) {
                return false;
            }
        
            return true;
        }
    };
    
    initHelixDBUtils();
}