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
 * Layout a single form element.
 */

/**
 * Private helper functions.
 */
function __mkTZOption(tzOffsetHours, curTime, text, val) {
    // Determine if the current time is in this time zone.
    var selected = false;
    if (Helix.Utils.isString(curTime)) {
        selected = (curTime === val);    
    } else {
        var tzOffset = tzOffsetHours * 60;
        if ((-tzOffset) == curTime.getTimezoneOffset()) {
            selected = true;
        }        
    }

    var tzO = $('<option />').attr({
        value: val,
        'data-offset' : tzOffsetHours
    }).append(text);
    if (selected) {
        tzO.attr("selected", true);
    }
    
    return tzO;
}

/**
 * Return true if we are in daylight savings time. False if not.
 */
function __isCurrentTZ(stdOffsetHours) {
    var today = new Date();
    var offsetMinutes = today.stdTimezoneOffset();
    if (offsetMinutes == (-stdOffsetHours * 60)) {
        return true;
    }
    return false;
}

function __getTZSelect(tabIndex, name, id, curTime) {
    var date = null;
    if (!curTime) {
        date = new Date();
    } else if (!Helix.Utils.isString(curTime)) {
        date = new Date(curTime);
    }
    
    var tzSelect = $('<select />').attr({
        'name' : name,
        'id' : id,
        'tabIndex' : tabIndex
    });
    __mkTZOption(-12.0, date, "(GMT -12:00) Eniwetok, Kwajalein", "ENIWETOK").appendTo(tzSelect);
    __mkTZOption(-11.0, date, "(GMT -11:00) Midway Island, Samoa", "MIDWAY_ISLAND").appendTo(tzSelect);
    __mkTZOption(-10.0, date, "(GMT -10:00) Hawaii", "HAWAII").appendTo(tzSelect);
    
    if (date.dst()) {
        __mkTZOption(-8.0, date, "(GMT -8:00) Alaska Daylight Time", "ALASKA").appendTo(tzSelect);
        __mkTZOption(-7.0, date, "(GMT -7:00) Pacific Daylight Time (US &amp; Canada)", "PACIFIC").appendTo(tzSelect);
        __mkTZOption(-6.0, date, "(GMT -6:00) Mountain Daylight Time (US &amp; Canada)", "MOUNTAIN").appendTo(tzSelect);              
        __mkTZOption(-5.0, date, "(GMT -5:00) Central Daylight Time (US &amp; Canada), Mexico City", "CENTRAL").appendTo(tzSelect);
        __mkTZOption(-4.5, date, "(GMT -4:30) Venezuela Standard Time, Caracas", "CARACAS").appendTo(tzSelect);
        __mkTZOption(-4.0, date, "(GMT -4:00) Eastern Daylight Time (US &amp; Canada), Bogota, Lima", "EASTERN").appendTo(tzSelect);
        __mkTZOption(-3.0, date, "(GMT -3:00) Atlantic Daylight Time (Canada), La Paz", "ATLANTIC_CANADA").appendTo(tzSelect);
        __mkTZOption(-2.5, date, "(GMT -2:30) Newfoundland Daylight Time", "NEWFOUNDLAND").appendTo(tzSelect);
        __mkTZOption(-2.0, date, "(GMT -2:00) Brazil, Buenos Aires, Georgetown", "BUENOS_AIRES").appendTo(tzSelect);
    } else {
        __mkTZOption(-9.0, date, "(GMT -9:00) Alaska", "ALASKA").appendTo(tzSelect);
        __mkTZOption(-8.0, date, "(GMT -8:00) Pacific Time (US &amp; Canada)", "PACIFIC").appendTo(tzSelect);
        __mkTZOption(-7.0, date, "(GMT -7:00) Mountain Time (US &amp; Canada)", "MOUNTAIN").appendTo(tzSelect);        
        __mkTZOption(-6.0, date, "(GMT -6:00) Central Time (US &amp; Canada), Mexico City", "CENTRAL").appendTo(tzSelect);
        __mkTZOption(-5.0, date, "(GMT -5:00) Eastern Time (US &amp; Canada), Bogota, Lima", "EASTERN").appendTo(tzSelect);
        __mkTZOption(-4.5, date, "(GMT -4:30) Venezuela Standard Time, Caracas", "CARACAS").appendTo(tzSelect);
        __mkTZOption(-4.0, date, "(GMT -4:00) Atlantic Time (Canada), La Paz", "ATLANTIC_CANADA").appendTo(tzSelect);
        __mkTZOption(-3.5, date, "(GMT -3:30) Newfoundland", "NEWFOUNDLAND").appendTo(tzSelect);
        __mkTZOption(-3.0, date, "(GMT -3:00) Brazil, Buenos Aires, Georgetown", "BUENOS_AIReS").appendTo(tzSelect);
        __mkTZOption(-2.0, date, "(GMT -2:00) Mid-Atlantic", "MID_ATLANTIC").appendTo(tzSelect);
    }
    __mkTZOption(-1.0, date, "(GMT -1:00 hour) Azores, Cape Verde Islands", "AZORES").appendTo(tzSelect);
    __mkTZOption(0.0, date, "(GMT) Western Europe Time, London, Lisbon, Casablanca", "GMT").appendTo(tzSelect);
    __mkTZOption(1.0, date, "(GMT +1:00 hour) Brussels, Copenhagen, Madrid, Paris", "PARIS").appendTo(tzSelect);
    __mkTZOption(2.0, date, "(GMT +2:00) Cairo, South Africa", "CAIRO").appendTo(tzSelect);
    __mkTZOption(3.0, date, "(GMT +3:00) Baghdad, Riyadh, Moscow, St. Petersburg", "MOSCOW").appendTo(tzSelect);
    __mkTZOption(3.5, date, "(GMT +3:30) Tehran", "TEHRAN").appendTo(tzSelect);
    __mkTZOption(4.0, date, "(GMT +4:00) Abu Dhabi, Muscat, Baku, Tbilisi", "ABU_DHABI").appendTo(tzSelect);
    __mkTZOption(4.5, date, "(GMT +4:30) Kabul", "KABUL").appendTo(tzSelect);
    __mkTZOption(5.0, date, "(GMT +5:00) Ekaterinburg, Islamabad, Karachi, Tashkent", "ISLAMABAD").appendTo(tzSelect);
    __mkTZOption(5.5, date, "(GMT +5:30) Bombay, Calcutta, Madras, New Delhi", "BOMBAY").appendTo(tzSelect);
    __mkTZOption(5.75, date, "(GMT +5:45) Kathmandu", "NEPAL").appendTo(tzSelect);
    __mkTZOption(6.0, date, "(GMT +6:00) Almaty, Dhaka, Colombo", "DHAKA").appendTo(tzSelect);
    __mkTZOption(7.0, date, "(GMT +7:00) Bangkok, Hanoi, Jakarta", "BANGKOK").appendTo(tzSelect);
    __mkTZOption(8.0, date, "(GMT +8:00) Beijing, Perth, Singapore, Hong Kong", "HONG_KONG").appendTo(tzSelect);
    __mkTZOption(9.0, date, "(GMT +9:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk", "TOKYO").appendTo(tzSelect);
    __mkTZOption(9.5, date, "(GMT +9:30) Adelaide, Darwin", "ADELAIDE").appendTo(tzSelect);
    __mkTZOption(10.0, date, "(GMT +10:00) Eastern Australia, Guam, Vladivostok", "VLADIVOSTOK").appendTo(tzSelect);
    __mkTZOption(11.0, date, "(GMT +11:00) Magadan, Solomon Islands, New Caledonia", "MAGADAN").appendTo(tzSelect);
    __mkTZOption(12.0, date, "(GMT +12:00) Auckland, Wellington, Fiji, Kamchatka", "WELLINGTON").appendTo(tzSelect);
    return tzSelect;
}

function __refreshDate(mode, formElem) {
    if (mode) {
        var thisField = $(formElem.DOM).find('[name="' + formElem.name + '"]');
        $(thisField).trigger('datebox', { method: 'set', value : formElem.value });
        $(thisField).trigger('datebox', { method: 'doset' });

        var timeElem = $(formElem.DOM).find('[name="' + formElem.name + '_time"]');
        if (timeElem.length > 0) {
            $(timeElem).trigger('datebox', { method: 'set', value: formElem.value });
            $(timeElem).trigger('datebox', { method: 'doset' });
        }
    } else {
        var dataNameAttr = '[data-name="' + formElem.name + '"]';
        var selector = 'span' + dataNameAttr + ',div' + dataNameAttr;
        $(formElem.DOM).find(selector).remove();
        if (formElem.value) {
            if (Object.prototype.toString.call(formElem.value) !== '[object Date]') {
                formElem.value = new Date(Number(formElem.value));
            }

            var dateMarkup;
            if (formElem.type === "date") {
                if (formElem.value) {
                    var dateValue = new Date(Number(formElem.value));
                    dateMarkup = $('<a />').attr({
                        'title': dateValue.toISOString()
                    }).prettyDate();
                } else {
                    dateMarkup = "none";
                }
                if (formElem.fieldTitle) {
                    formElem.DOM.append($('<span/>').attr({
                        'style' : formElem.computedStyle,
                        'class' : formElem.computedStyleClass,
                        'data-name' : formElem.name
                    }).append("&nbsp;" + $(dateMarkup).text())); 
                } else {
                    formElem.DOM.append($('<div />').attr({
                        'data-name' : formElem.name
                    }).append($(dateMarkup).text()));
                }
            } else {
                var dateSpan = $('<span/>').attr('data-name', formElem.name).append("&nbsp;" + formElem.value.toLocaleString());
                if (formElem.computedStyle) {
                    dateSpan.attr('style', formElem.computedStyle);
                }
                if (formElem.computedStyleClass) {
                    dateSpan.addClass(formElem.computedStyleClass); 
                }
                if (formElem.fieldTitle) {
                    dateSpan.attr('data-name', formElem.name);
                    formElem.DOM.append(dateSpan);
                } else {
                    formElem.DOM.append($('<div />').attr({
                        'data-name' : formElem.name
                    }).append(dateSpan));
                }
            }
        }
    }
}

function __appendDate(mode, formLayout, formElem, $fieldContainer, useMiniLayout) {
    if (!formElem.name) {
        console.log("Cannot add a date field with no name to a form layout.");
        return;
    }
    if (mode) {
        var defaultValue = Date.now();
        if (formElem.value) {
            defaultValue = formElem.value;
        }

        /* Edit */
        var dateDiv = $('<div />').attr({
            'data-role' : 'fieldcontain',
            'style' : formLayout.computedFieldStyle,
            'class' : formLayout.computedFieldStyleClass + (useMiniLayout ? 'hx-mini-fieldcontain' : '')
        })
        .append($('<label />').attr({
            'for' : formElem.name,
            'class' : formLayout.titleStyleClass + (useMiniLayout ? ' hx-full-width' : '')
            })
            .append(formElem.fieldTitle)
        );
        var inputWrapper = $('<div />').attr({ 
            'style' : formElem.computedStyle,
            'class' : formElem.computedStyleClass
        }).appendTo(dateDiv);
        var inputID = Helix.Utils.getUniqueID();
        var dateInput = $('<input />').attr({
            'name': formElem.name,
            'id': inputID,
            'data-role' : 'none',
            'style' : 'font-size: 16px'
        }).appendTo(inputWrapper);
        var timeInput = null;
        if (formElem.type === 'datetime') {
            /* Add a time box. */
            timeInput = $('<input />').attr({
                'name': formElem.name + "_time",
                'id': inputID + "_time",
                'data-role' : 'none',
                'style' : 'font-size: 16px'
            }).appendTo(inputWrapper);
        }
        
        // 'value' : defaultValueText,
        $fieldContainer.append(dateDiv);
        dateInput.datebox({"mode" : "flipbox", 
            "useNewStyle":false, 
            "defaultValue": defaultValue, 
            "openCallback" : (formElem.onfocus ? formElem.onfocus : false),
            "closeCallback" : (formElem.onchange ? formElem.onchange : false),
            "displayInline" : (timeInput ? true : false)
        });
        if (timeInput) {
            var minuteStep = 1;
            if (formElem.options && formElem.options.minuteStep) {
                minuteStep = formElem.options.minuteStep;
            }
            timeInput.datebox({"mode" : "timeflipbox", 
                "overrideTimeFormat" : 12, 
                "overrideTimeOutput" : "%l:%M %p", 
                "defaultValue": defaultValue,
                "openCallback" : (formElem.onfocus ? formElem.onfocus : false),
                "closeCallback" : (formElem.onchange ? formElem.onchange : false),
                "displayInline" : (timeInput ? true : false),
                "minuteStep" : minuteStep
            });
        }
        dateDiv.fieldcontain();
    } else {
        __refreshDate(mode, formElem);
    }
}

function __refreshTZSelector(mode, formElem) {
    if (!formElem.value) {
        // Use the current time zone.
        var curTime = new Date();
        var tzOffsetHours = -(curTime.getTimezoneOffset() / 60.0);
        formElem.value = $(formElem.DOM).find('option[data-offset="' + tzOffsetHours + '"]').attr('value');
    }
    
    if (mode) {
        $(formElem.DOM).find('option').prop({ selected : false });
        $(formElem.DOM).find('option[value="' + formElem.value + '"]').prop({ selected : true });
        $(formElem.DOM).find('select').selectmenu('refresh');
    } else {
        $('p[data-name="'+ formElem.name + '"]').empty().append(formElem.value);
    }
}

function __appendTZSelector(mode, formLayout, formElem, $fieldContainer, useMiniLayout) {
    if (!formElem.name) {
        /* No field name. We cannot render this field. */
        console.log("Cannot add a TZ selector with no name to a form layout.");
        return;
    }
    if (mode) {
        var defaultValue = Date.now();
        if (formElem.value) {
            defaultValue = formElem.value;
        }

        /* Edit */
        var labelWidthOverride = '';
        if (useMiniLayout) {
            // On small devices force the label on to a full line.
            labelWidthOverride = ';width: 100%';
        }
        var inputID = Helix.Utils.getUniqueID();
        var dateDiv = $('<div />').attr({
            'data-role' : 'fieldcontain',
            'style' : formLayout.computedFieldStyle,
            'class' : formLayout.computedFieldStyleClass
        })
        .append($('<label />').attr({
            'for' : inputID,
            'style' : 'vertical-align: middle' + labelWidthOverride,
            'class' : 'ui-input-text ' + formLayout.titleStyleClass
            })
            .append(formElem.fieldTitle)
        );
        
        var tzSelect = __getTZSelect(formLayout.__tabIndex++, formElem.name, inputID, defaultValue).appendTo(dateDiv);
        if (formElem.onchange) {
            $(tzSelect).change(function() {
                var newVal = $(this).find("option:selected");
                formElem.onchange.call(this, newVal.val(), newVal);
            });
        }
        
        // 'value' : defaultValueText,
        $fieldContainer.append(dateDiv);
        tzSelect.selectmenu();
        dateDiv.fieldcontain();
        if (formElem.computedStyle || formElem.computedStyleClass) {
            var uiSelect = $(dateDiv).find('div.ui-select');
            if (formElem.computedStyle) {
                uiSelect.attr('style', formElem.computedStyle);
            }
            if (formElem.computedStyleClass) {
                uiSelect.addClass(formElem.computedStyleClass); 
            }
        }

    } else {
        $fieldContainer.append($('<p />').attr('data-name', formElem.name).append(formElem.value));
    }
}

function __refreshTextArea(mode, formElem) {
    if (mode) {
        var $input = $(formElem.DOM).find('textarea[name="'+formElem.name+'"]');
        $input.val(formElem.value);
    } else {
        var dataNameAttr = '[data-name="' + formElem.name + '"]';
        var selector = 'span' + dataNameAttr + ',p' + dataNameAttr;
        var $span = $(formElem.DOM).find(selector);
        if ($span.is('span')) {
            $span.html("&nbsp;" + formElem.value);
        } else {
            /* Should be a 'p' tag. */
            $span.html(formElem.value);
        }
    }
}

function __appendTextArea(mode, formLayout, formElem, $fieldContainer) {
    if (!formElem.value) {
        formElem.value = "";
    }
    
    if (!formElem.name) {
        /* No field name. We cannot use this field in a form layout. */
        console.log("Cannot use a text area field with no name in a form layout.");
        return;
    }
    
    if (mode) {
        /* Edit */
        // Use the mini style to set font size to 'small'
        var inputID = Helix.Utils.getUniqueID();
        var inputMarkup = $('<textarea />').attr({
            'name': formElem.name,
            'id' : inputID,
            'style': formElem.computedStyle,
            'class' : formElem.computedStyleClass,
            'tabindex' : formLayout.__tabIndex++
        }).append(formElem.value);

        var textContainer = $('<div />').attr({
            'data-role' : 'fieldcontain',
            'style' : formLayout.computedFieldStyle,
            'class' : 'hx-mini-fieldcontain ' + formLayout.computedFieldStyleClass
        })
        .append($('<label />').attr({
            'for' : inputID
            })
            .append(formElem.fieldTitle)
        )
        .append(inputMarkup);
        $fieldContainer.append(textContainer);
        textContainer.fieldcontain();
        $(inputMarkup).textinput();
        if (formElem.fieldTitleType === 'button') {
            $(formElem.fieldTitle).button();
        }
        if (formElem.onblur) {
            $(inputMarkup).blur(function() {
                formElem.onblur.apply(this);
            });
        }
    } else {
        if (formElem.fieldTitle && (typeof formElem.fieldTitle == "string")) {
            $fieldContainer.append($('<span />').attr('data-name', formElem.name).append("&nbsp;" + formElem.value));
        } else {
            $fieldContainer.append($('<p />').attr('data-name', formElem.name).append(formElem.value));
        }
    }
}

function __refreshSelectMenu(formElem) {
    var $fieldContainer = formElem.DOM;
    if ($fieldContainer) {
        $fieldContainer.empty();
    }
    
    var inputID = Helix.Utils.getUniqueID();
    var inputMarkup = $('<select />').attr({
        'name': formElem.name,
        'id' : inputID,
        'tabindex' : formElem.tabIndex
    });

    var i;
    for (i = 0; i < formElem.options.length; ++i) {
        // If not independent label is specified, make it the same as the value.
        if (!formElem.options[i].label) {
            formElem.options[i].label = formElem.options[i].value;
        }
        var option = $('<option />').attr({
            'value': formElem.options[i].value
        }).append(formElem.options[i].label).appendTo(inputMarkup);

        if (formElem.value && formElem.options[i].value == formElem.value) {
            // This item is selected.
            option.attr('selected', true);
        }
    }

    var selectContainer = $('<div />').attr({
        'data-role' : 'fieldcontain',
        'style' : formElem.computedStyle
    })
    .append($('<label />').attr({
        'for' : inputID
        })
        .append(formElem.fieldTitle)
    )
    .append(inputMarkup);
    $fieldContainer.append(selectContainer);
    selectContainer.fieldcontain();
    $(inputMarkup).selectmenu();
}

function __appendSelectMenu(mode, formLayout, formElem, $fieldContainer) {
    if (!formElem.name) {
        /* No field name. We cannot edit this field. */
        console.log("Invalid select menu in form layout. No field name specified.");
        return;
    }
    if (mode) {
        /* Edit */
        if (!formElem.options) {
            return;
        }
        
        formElem.tabIndex = formLayout.__tabIndex++;
            
        __refreshSelectMenu(formElem, $fieldContainer);
    } else {
        $fieldContainer.append($('<p />').attr('data-name', formElem.name).append(formElem.value ? formElem.value : ""));
    }
}

function __refreshTextBox(mode, formElem) {
    if (mode) {
        var $input = $(formElem.DOM).find('input[name="'+formElem.name+'"]');
        $input.val(formElem.value);
    } else {
        var dataNameAttr = '[data-name="' + formElem.name + '"]';
        var selector = 'span' + dataNameAttr + ',p' + dataNameAttr;
        var $span = $(formElem.DOM).find(selector);
        if ($span.is('span')) {
            $span.html("&nbsp;" + formElem.value);
        } else {
            /* Should be a 'p' tag. */
            $span.html(formElem.value);
        }
    }
}

function __appendTextBox(mode, formLayout, formElem, $fieldContainer, useMiniLayout) {
    if (!formElem.value) {
        formElem.value = "";
    }
    
    if (mode) {
        /* Edit */
        if (mode && !formElem.name) {
            /* No field name. We cannot edit this field. */
            return;
        }

        if (!formElem.dataType) {
            formElem.dataType = "text";
        }

        var inputID = Helix.Utils.getUniqueID();
        var inputMarkup = $('<input />').attr({
            'name': formElem.name,
            'id' : inputID,
            'type': formElem.dataType,
            'value': (formElem.value),
            'tabindex' : formLayout.__tabIndex++
        });
        
        // WE always use the mini style. Otherwise the fonts are too large even on tablets.
        var textContainer = $('<div />').attr({
            'data-role' : 'fieldcontain',
            'style' : formLayout.computedFieldStyle,
            'class' : 'hx-mini-fieldcontain ' + formLayout.computedFieldStyleClass
        })
        .append($('<label />').attr({
            'for' : inputID,
            'class' : formLayout.titleStyleClass
            })
            .append(formElem.fieldTitle)
        )
        .append(inputMarkup);
        $fieldContainer.append(textContainer);
        textContainer.fieldcontain();
        $(inputMarkup).textinput();
        if (formElem.fieldTitleType === 'button') {
            $(formElem.fieldTitle).button();
        }
        if (formElem.onblur) {
            $(inputMarkup).blur(function() {
                formElem.onblur.apply(this);
            });
        }
        // Apply styling to the input text div ...
        if (formElem.computedStyle || formElem.computedStyleClass) {
            var uiInputText = textContainer.find('div.ui-input-text');
            if (formElem.computedStyle) {
                $(uiInputText).attr('style', formElem.computedStyle);
            }
            if (formElem.computedStyleClass) {
                $(uiInputText).addClass(formElem.computedStyleClass);
            }
        }
    } else {
        if (formElem.fieldTitle && (typeof formElem.fieldTitle == "string")) {
            var valSpan = $('<span/>').attr({
                'data-name' : formElem.name,
                'class' : 'ui-input-text'
            }).append("&nbsp;" + formElem.value)
            if (formElem.computedStyle) {
                valSpan.attr('style', formElem.computedStyle);
            }
            if (formElem.computedStyleClass) {
                valSpan.addClass(formElem.computedStyleClass);
            }
            $fieldContainer.append(valSpan);
        } else {
            $fieldContainer.append($('<p />').attr({
                'data-name' : formElem.name,
                'class' : formElem.computedStyleClass + ' ui-input-text'
            }).append(formElem.value));
        }
    }
}

function __appendCheckBox(mode, formLayout, formElem, $fieldContainer, useMiniLayout) {
    if (!formElem.name) {
        /* No field name. We cannot edit this field. */
        console.log("Invalid checkbox in form layout. No field name specified.");
        return null;
    }
    
    var type = 'checkbox';
    if (formElem.type === 'radio') {
        type = 'radio';
    }
    
    var inputID = Helix.Utils.getUniqueID();
    var inputMarkup = $('<input/>').attr({
        'name': formElem.name,
        'id' : inputID,
        'type' : type,
        'tabindex' : -1
    });
    __refreshControl(formElem, true);
    $('<label />').attr('for', inputID).append(formElem.fieldTitle).appendTo($fieldContainer);
    $(inputMarkup).appendTo($fieldContainer);
    $(inputMarkup).checkboxradio({ mini: useMiniLayout });
    if (!mode) {
        /* View */
        $(inputMarkup).checkboxradio("disable");
    }        
    return inputMarkup;
}

function __refreshControl(subElem, noRefresh) {
    var DOM;
    if ($(subElem.DOM).is('input')) {
        DOM = subElem.DOM;
    } else {
        DOM = $(subElem.DOM).find('input');
    }
    
    if (subElem.value) {
        if (typeof subElem.value === "boolean" &&
            subElem.value) {
            $(DOM).attr('checked', 'true');
        } else if (subElem.value === "true") {
            $(DOM).attr('checked', 'true');
        }
    } else if (subElem.value !== undefined) {
        $(DOM).removeAttr('checked');
    }
    if (!noRefresh) {
        $(DOM).checkboxradio("refresh");
    }
}

function __refreshRadioButtons(formElem) {
    // Clear out all selections.
    $(formElem.DOM).find('input').removeAttr('checked').prop('checked', false);
    $(formElem.DOM).find('input[data-value="' + formElem.value + '"]').attr('checked', true).prop('checked', true);
    $(formElem.DOM).find('fieldset').controlgroup('refresh');
}

function __appendRadioButtons(mode, formLayout, formElem, $fieldContainer, useMiniLayout) {
    if (!formElem.name) {
        console.log("Skipping radio buttons because it has no name.");
        return;
    }
    
    var fieldMarkup = $('<div />').attr({
        'data-role' : 'fieldcontain'
    }).appendTo($fieldContainer);

    var formMarkup = $("<form />").appendTo(fieldMarkup);
    var wrapperMarkup = $('<fieldset/>').attr({
        'data-role' : 'controlgroup',
        'data-type' : 'horizontal',
        'data-mini' : (useMiniLayout ? 'true' : 'false')
    }).appendTo(formMarkup);

    if (formElem.fieldTitle) {
        wrapperMarkup.append($('<legend/>').attr({
            'class' : formLayout.titleStyleClass
        }).append(formElem.fieldTitle));
    }

    var i = 0;
    for (i = 0; i < formElem.controls.length; ++i) {
        var subElem = formElem.controls[i];
        __preprocessFormElement(formLayout, subElem);
        if (subElem.hidden || subElem.disabled) {
            continue;
        }
        subElem.name = formElem.name;
        subElem.type = 'radio';
        var inputMarkup = __appendCheckBox(mode, formLayout, subElem, wrapperMarkup, useMiniLayout);
        if (mode) {
            subElem.editDOM = inputMarkup;
        } else {
            subElem.viewDOM = inputMarkup;
        }
        if (formLayout.currentMode === 'edit') {
            subElem.DOM = subElem.editDOM;
        } else {
            subElem.DOM = subElem.viewDOM;
        }
        if (subElem.defaultValue !== undefined) {
            $(inputMarkup).attr('data-value', subElem.defaultValue);
        }
        if (subElem.defaultValue === formElem.defaultValue) {
            $(inputMarkup).attr('checked', 'true');
        }
    }
    $(wrapperMarkup).controlgroup({ mini : useMiniLayout });
    $(fieldMarkup).fieldcontain();
}

function __appendControlSet(mode, formLayout, formElem, $fieldContainer, useMiniLayout) {
    var fieldMarkup = $('<div />').attr({
        'data-role' : 'fieldcontain'
    }).appendTo($fieldContainer);

    var wrapperMarkup = $('<fieldset/>').attr({
        'data-role' : 'controlgroup',
        'data-type' : 'horizontal',
        'data-mini' : (useMiniLayout ? 'true' : 'false')
    }).appendTo(fieldMarkup);

    if (formElem.fieldTitle) {
        wrapperMarkup.append($('<legend/>').attr({
            'class' : formLayout.titleStyleClass
        }).append(formElem.fieldTitle));
    }

    var i = 0;
    for (i = 0; i < formElem.controls.length; ++i) {
        var subElem = formElem.controls[i];
        __preprocessFormElement(formLayout, subElem);
        if (subElem.hidden || subElem.disabled) {
            continue;
        }
        if (!subElem.name) {
            console.log("Skipping controlset checkbox because it has no name.");
            continue;
        }
        var inputMarkup = __appendCheckBox(mode, formLayout, subElem, wrapperMarkup, useMiniLayout);
        if (mode) {
            subElem.editDOM = inputMarkup;
        } else {
            subElem.viewDOM = inputMarkup;
        }
        if (formLayout.currentMode === 'edit') {
            subElem.DOM = subElem.editDOM;
        } else {
            subElem.DOM = subElem.viewDOM;
        }
    }
    $(wrapperMarkup).controlgroup({ mini : useMiniLayout });
    $(fieldMarkup).fieldcontain();
}

function __appendButton(mode, formLayout, formElem, $fieldContainer, useMiniLayout) {
    var $buttonLink;
    if (!formElem.fieldTitle) {
        formElem.fieldTitle = "";
    }
    if (formElem.iconClass) {
        $buttonLink = $('<a />').attr({
            'data-role' : 'button',
            'data-iconpos' : 'bottom',
            'data-icon' : formElem.iconClass,
            'data-iconshadow' : true,
            'class' : 'iconbutton'
        }).append(formElem.fieldTitle).button();            
    } else {
        $buttonLink = $('<a />').attr({
            'data-role' : 'button',
            'data-inline' : true,
            'data-theme' : 'b'
        }).append(formElem.fieldTitle).button();
    }
    if (formElem.href) {
        $buttonLink.attr('href', formElem.href);
    } else {
        $buttonLink.attr('href', 'javascript:void(0);');
    }
    $buttonLink.appendTo($fieldContainer);
    $buttonLink.buttonMarkup({ mini : useMiniLayout });
    if (formElem.onclick) {
        $buttonLink.on('tap', function(ev) {
            formElem.onclick.call(this, ev);
        });
    }
}

function __setHref(elem, href) {
    elem.href = null;
    if (!Helix.hasTouch) {
        elem.onclick = function() {
            window.open(href);
        };
    } else {
        elem.ontouchstart = function() {
            window.open(href);
        };
        /*elem.addEventListener('touchstart', function() {
            window.open(href);
        }, false);*/
    }
}

function __autoResize(id){
    var elem = document.getElementById(id);
    if (elem == null) {
        // Frame has been removed from the DOM.
        return;
    }
    
    // Eventually add a way to toggle this off.
    var allLinks = elem.contentWindow.document.getElementsByTagName("a");
    for (var i = 0; i < allLinks.length; ++i) {
        var nxt = allLinks[i];
        var href = nxt.href;
        if (href) {
            __setHref(nxt, href);
        }
    }
}

function __layoutFrames(page, formLayout) {
    $(page).off('hxLayoutDone.frames').on('hxLayoutDone.frames', function() {
        if (!formLayout.__layoutFrames) {
            return;
        }
        for (var i = 0; i < formLayout.__layoutFrames.length; ++i) {
            __autoResize(formLayout.__layoutFrames[i]);
        }
    });
}

function __refreshIFrame(formElem) {
    var frameID = formElem.name;
    var $frame = formElem.DOM.find(PrimeFaces.escapeClientId(frameID));
    
    // Load the iframe document content
    var contentWindow = $frame[0].contentWindow;
    var doc = contentWindow.document;
    doc.open();
    if (!formElem.noHTML) {
        doc.write('<html>');
    }
    if (!formElem.noHead) {
        doc.write('<head>');
        doc.write('<meta name="viewport" content="width=device-width,height=device-height,initial-scale=1"/>');
        doc.write('</head>');
    }
    if (!formElem.noBody) {
        doc.write('<body style="height: 100%;">');
    }
    if (formElem.isScroller) {
        $(doc.body).css('overflow-y', 'scroll');
    }
    doc.write(formElem.value);
    if (!formElem.noHTML) {
        doc.write('</html>');
    }
    if (!formElem.noBody) {
        doc.write('</body>');
    }
    doc.close();
    $frame.show();
}

function __appendIFrame(mode, formLayout, formElem, $fieldContainer, useMiniLayout, page) {
    if (formElem.height === 'full') {
        $fieldContainer.addClass('pm-layout-full-height');
    }
    
    if (!mode) {
        var frameID = formElem.name;
        if (!frameID) {
            console.log("Each IFrame form element must have a name. Cannot specify an IFrame form element without either.");
            return;
        }
        var iFrameMarkup = null;
        var iFrameStyle = ' style="border:0px;"';
        
        if (!formElem.height || (formElem.height === 'full')) {
            iFrameMarkup = '<iframe id="' + frameID + '" src="javascript:true;"' +
                ' width="' + (formElem.width ? formElem.width : '100%') + '"' +
                iFrameStyle + '">';
            if (!formLayout.__layoutFrames || formLayout.__layoutFrames.length == 0) {
                formLayout.__layoutFrames = [];
                __layoutFrames(page, formLayout);
            }
            formLayout.__layoutFrames.push(frameID)
        } else {
            iFrameMarkup = '<iframe id="' + frameID + '" src="javascript:true;" height="' + formElem.height + 
                '" width="' + (formElem.width ? formElem.width : '100%') + '"' +
                iFrameStyle + '">';
        }
        
        $(iFrameMarkup).appendTo($fieldContainer).hide();
        __refreshIFrame(formElem);
    }
}

function __refreshButtonGroup(formElem) {
    if (!formElem.buttons) {
        return;
    }
    var $buttonBar = $(formElem.DOM).find('.buttonBarMaster').empty();
    
    var formButton;
    var formButtonIdx;
    for (formButtonIdx = 0; formButtonIdx < formElem.buttons.length; ++formButtonIdx) {
        formButton = formElem.buttons[formButtonIdx];
        if (!formButton.iconPos && formButton.iconPos !== 'none') {
            formButton.iconPos = 'bottom';
        }
        if (!formButton.computedStyleClass && formButton.iconPos !== 'none') {
            formButton.computedStyleClass = 'iconbutton';
        }
        if (!formButton.theme) {
            formButton.theme = 'b';
        }
        if (!formButton.iconClass) {
            formButton.iconClass = '';
        }
        var $buttonBarLink = $('<a />').attr({
            'data-iconpos' : formButton.iconPos,
            'data-icon' : formButton.iconClass,
            'data-iconshadow' : false,
            'data-theme' : formButton.theme,
            'class' : formButton.computedStyleClass
        });
        if (formButton.mini) {
            $buttonBarLink.attr('data-mini', 'true');
        }
        if (formButton.fieldTitle) {
            $buttonBarLink.append(formButton.fieldTitle);
        } 
        if (formButton.href) {
            $buttonBarLink.attr('href', formButton.href);
        } else {
            $buttonBarLink.attr('href', 'javascript:void(0);');
        }
        if (formButton.onclick) {
            $buttonBarLink.on('tap', formButton.onclick);
        }
        $buttonBarLink.appendTo($buttonBar);
        $buttonBarLink.button();
    }
    $buttonBar.controlgroup({ type: "horizontal" });
}

function __refreshHTMLArea(formElem) {
    if ($(formElem.editDOM).is(':visible')) {
        var elem = $(formElem.DOM).find('[name="' + formElem.name + '"]');
        var $editor = $(elem).data('cleditor');
        if (!formElem.value) {
            $editor.clear(); 
        } else {
            $editor.update(formElem.value);
        }        
    } else if ($(formElem.viewDOM).is(':visible')) {
        var viewContainer = $(formElem.viewDOM).find('div[data-name="' + formElem.name + '"]').empty();
        viewContainer.append(formElem.value);
    }
}

function __appendHTMLArea(mode, formLayout, formElem, $fieldContainer, useMiniLayout, page, parentDiv) {
    var isFullWidth = false;
    if (formElem.width) {
        if (formElem.width === "full") {
            isFullWidth = true;
        }            
    }
    if (mode) {
        if (!formElem.name) {
            /* No field name. We cannot edit this field. */
            console.log("Cannot layout an HTML area in edit mode without an element name.");
            return;
        }

        var editorID = Helix.Utils.getUniqueID();
        var editorInput = $('<textarea />').attr({
            'name' : formElem.name,
            'id' : editorID,
            'tabIndex' : -1
        }).val(formElem.value);
        $fieldContainer.append($('<div />')
            .append($('<label />').attr({
                'for' : editorID
                })
                .append(formElem.fieldTitle)
            )
            .append(editorInput)
        );
        $(editorInput).cleditor({
            'widget' : editorID + "_widget",
            'width' : (formElem.width ? formElem.width : $(parentDiv).width()),
            'isFullWidth' : isFullWidth,
            'height' : (formElem.height ? formElem.height : 350),
            'page' : page,
            'tabIndex' : formLayout.__tabIndex++
        });
    } else {
        var width = "98%";
        if (isFullWidth) {
            width = "100%";
        } else if (formElem.width) {
            width = formElem.width;
        }
        if (!formElem.name) {
            formElem.name = Helix.Utils.getUniqueID();
        }
        
        var htmlDiv = $('<div />').attr('data-name', formElem.name).append(formElem.value);
        if (formElem.computedStyle) {
            htmlDiv.attr('style', formElem.computedStyle);
        }
        if (formElem.computedStyleClass) {
            htmlDiv.addClass(formElem.computedStyleClass); 
        }
        $fieldContainer.append(htmlDiv);
        if (formElem.isScroller) {
            $fieldContainer.helixScrollingDiv({ width: width });
        } else {
            $fieldContainer.css('overflow', 'none');
            $fieldContainer.width(width);
        }
    }
}

function __appendButtonGroup(mode, formLayout, formElem, $fieldContainer, useMiniLayout) {
    var $buttonBar = $('<div />').attr({
        'class' : 'buttonBarMaster buttonbar'
    }).appendTo($fieldContainer);
    if (formElem.name) {
        $buttonBar.attr('id', formElem.name);
    }
    __refreshButtonGroup(formElem);
}

function __refreshHorizontalScroll(formElem) {
    var hscroll = $(formElem.DOM).find('div[data-name="' + formElem.name + '"]');
    $(hscroll).empty();
    if (formElem.value) {
        $(hscroll).append(formElem.value);
    }
}

function __appendHorizontalScroll(mode, formLayout, formElem, $fieldContainer, useMiniLayout) {
    var hscroll = $('<div />').attr({
        'class' : 'hx-horizontal-scroller-nozoom hx-full-width',
        'data-name' : formElem.name
    }).appendTo($fieldContainer);
    if (formElem.value) {
        hscroll.append(formElem.value);
    }
}

function __appendSubPanel(mode, formLayout, formElem, $fieldContainer, useMiniLayout, page) {
    var subPanelObj = formElem;
    
    // The panelMode field determines if the subPanel is in a fixed mode (edit or view), or it is the same/reverse
    // of the main form.
    if (!subPanelObj.panelMode) {
        // Render in the same mode as the enclosing form.
        subPanelObj.modes = formLayout.modes;
        subPanelObj.currentMode = formLayout.currentMode;
    } else if (subPanelObj.panelMode === 'reverse') {
        // Opposite of the parent.
        subPanelObj.currentMode = (formLayout.currentMode === 'edit' ? 'view' : 'edit');
        subPanelObj.modes = subPanelObj.panelMode;
    } else {
        // Fixed value.
        subPanelObj.currentMode = subPanelObj.panelMode;
        subPanelObj.modes = subPanelObj.panelMode;
    }
    
    
    ++Helix.Utils.nSubPanels;
    var subPanelID = formElem.id;
    if (!subPanelID) {
        subPanelID = 'subpanel' + Helix.Utils.nSubPanels;
    }
    var subPanelDiv = $('<div />').attr({
        'id' : subPanelID
    }).appendTo($fieldContainer);

    // Layout the elements in the sub-panel add a separator between elements
    // but not between items in each element.
    Helix.Utils.layoutForm(subPanelDiv, subPanelObj, page, useMiniLayout);

    // Prepend here rather than appending before the layoutForm call because layoutForm
    // empties the parent div.
    subPanelDiv.prepend($('<h3 />').append(formElem.fieldTitle));

    // Make sure we have a dynamic page used to create new items in this 
    // subpanel.
    //var dialogId;
    if (subPanelObj.dialog &&
        (subPanelObj.dialog.activeMode == -1 ||
            mode == subPanelObj.dialog.activeMode )) {
        var dialogObj = Helix.Utils.createDialog(subPanelObj.dialog, subPanelObj.dialog.uniqueID, formElem.fieldTitle, page);

        // Add a button to open the dialog.
        $('<a />').attr({
            'href' : 'javascript:void(0)',
            'data-role' : 'button',
            'data-inline' : 'true',
            'data-theme' : 'b'
        })
        .append(subPanelObj.dialog.dialogTitle)
        .appendTo(subPanelDiv)
        .on('tap', function() {
            $.mobile.changePage(PrimeFaces.escapeClientId(dialogObj.id), {});
        })
        .button();
    }

    // Create the collapsible content.
    subPanelDiv.collapsible({
        collapsed: !subPanelObj.noCollapse
    });
    $(subPanelDiv).on('collapsibleexpand', function(event, ui) {
        __layoutFrames(page, subPanelObj);
    });
    
    // Determine if the sub-panel is visible based on the 'mode' field.
    if (subPanelObj.mode && subPanelObj.mode !== 'all') {
        if (subPanelObj.mode !== formLayout.currentMode) {
            // Not visible.
            $fieldContainer.hide();
            return;
        }
    }
    $fieldContainer.show();
}

function __preprocessFormElement(formLayout, formElem) {
    if (formElem.styleClass) {
        if (!Helix.Utils.isString(formElem.styleClass)) {
            formElem.computedStyleClass = 
                (formElem.styleClass[Helix.deviceType] ?  formElem.styleClass[Helix.deviceType] : formElem.styleClass['default']);
        } else {
            formElem.computedStyleClass = formElem.styleClass;
        }
    }
    
    formElem.computedStyle = '';
    if (formElem.style) {
        if (!Helix.Utils.isString(formElem.style)) {
            formElem.computedStyle = 
                (formElem.style[Helix.deviceType] ?  formElem.style[Helix.deviceType] : formElem.style['default']);
        } else {
            formElem.computedStyle = formElem.style + ";";
        }
    }

    if (formElem.width) {
        if (!Helix.Utils.isString(formElem.width)) {
            /* Mapping from device type to width. */
            formElem.computedStyle = formElem.computedStyle + 'width: ' + 
                (formElem.width[Helix.deviceType] ?  formElem.width[Helix.deviceType] : formElem.width['default']);
        } else {
            formElem.computedStyle = formElem.computedStyle + 'width: ' + (formElem.width === 'full' ? "100%" : formElem.width);
        }
    } else {
        formElem.computedStyle = formElem.computedStyle + 'width: 90%;';
    }
    
    if (!formElem.mode) {
        formElem.mode = 'all';
    }
    
    if (!formElem.value) {
        // Set to the default.
        formElem.value = formElem.defaultValue;
    }
    
    if (formLayout.currentMode === 'view') {
        /* skip in view mode. */
        formElem.disabled = (formElem.mode === 'edit');
        return;
    } 
    
    if (formLayout.currentMode === 'edit') {
        /* skip in edit mode. */
        formElem.disabled = (formElem.mode === 'view');
        return;
    } 
    
    formElem.disabled = false;
}

Helix.Utils.noTitleLayouts = {
    "button" : true,
    "controlset" : true,
    "radio" : true,
    "subPanel" : true
};

Helix.Utils.fieldContainers = {
    'text' : true,
    'date' : true,
    'exactdate' : true,
    'datetime' : true
};

Helix.Utils.layoutFormElement = function(formLayout, formElem, parentDiv, page, useMiniLayout) {
    var supportedModes = formLayout.modes;
    var currentMode = formLayout.currentMode;
    
    var separateElements = formLayout.separateElements;
    
    __preprocessFormElement(formLayout, formElem);
    
    /*if (formElem.disabled) {
        return;
    }*/
    
    if (formElem.type == 'separator') {
        if (formElem.mode === 'all') {
            formElem.viewDOM = $('<hr />').appendTo(parentDiv);
            formElem.editDOM = $('<hr />').appendTo(parentDiv);
        } else if (formElem.mode === 'view') {
            formElem.viewDOM = $('<hr />').appendTo(parentDiv);
        } else {
            formElem.editDOM = $('<hr />').appendTo(parentDiv);
        }

        if (formLayout.currentMode === 'view') {
            formElem.DOM = formElem.viewDOM;
        } else {
            formElem.DOM = formElem.editDOM;
        }

        return;
    } 
    
    var $viewFieldContainer, $editFieldContainer;
    var containerID = null;    
    if (formElem.id) {
        containerID = formElem.id + "_container";
    } else if (formElem.name) {
        containerID = formElem.name + "_container";
    } else {
        containerID = Helix.Utils.getUniqueID();
    }
    
    if (supportedModes !== 'edit' &&
        formElem.mode !== 'edit') {
        /* View mode. */
        formElem.viewDOM = $viewFieldContainer = $('<div />')
        .css("clear", "both")
        .css('-webkit-user-select', 'none')
        .attr('id', containerID + "_view")
        .appendTo(parentDiv);
        if (formLayout.computedFieldStyleClass) {
            $viewFieldContainer.attr('class', formLayout.computedFieldStyleClass);
        }
        if (formLayout.computedFieldStyle) {
            $viewFieldContainer.attr('style', formLayout.computedFieldStyle);
        }
        if (formElem.fieldTitle && !(formElem.type in Helix.Utils.noTitleLayouts)) {
            if (formElem.titleStyleClass) {
                $viewFieldContainer.append($('<span />').attr({
                    'class' : formElem.titleStyleClass + ' ui-input-text'
                }).append(formElem.fieldTitle));
            } else if (formLayout.titleStyleClass) {
                $viewFieldContainer.append($('<span />').attr({
                    'class' : formLayout.titleStyleClass + ' ui-input-text'
                }).append(formElem.fieldTitle));
            } else {
                $viewFieldContainer.append(formElem.fieldTitle);
            }
            if (formElem.type in Helix.Utils.fieldContainers) {
                $viewFieldContainer.addClass('hx-mini-fieldview'); 
                $viewFieldContainer.addClass('ui-fieldcontain'); 
                $viewFieldContainer.addClass('ui-body'); 
                $viewFieldContainer.addClass('ui-br');
            }
        }
    } 
    
    if (supportedModes !== 'view' &&
        formElem.mode !== 'view') {
        /* Edit mode. */
        formElem.editDOM = $editFieldContainer = $('<div />').attr({
            'id' : containerID + "_edit"
        }).appendTo(parentDiv);
    }
    if (currentMode === 'view') {
        formElem.DOM = $viewFieldContainer;
    } else {
        formElem.DOM = $editFieldContainer;
    }
    
    var renderFn = null;
    if (formElem.type == "text") {
        renderFn = __appendTextBox;
    } else if (formElem.type == 'textarea') {
        renderFn = __appendTextArea;
    } else if (formElem.type == 'pickList') {
        renderFn = __appendSelectMenu;
    } else if (formElem.type == 'checkbox') {
        renderFn = __appendCheckBox;
    } else if (formElem.type === 'controlset') {
        renderFn = __appendControlSet;
    } else if (formElem.type === 'radio') {
        renderFn = __appendRadioButtons;
    } else if (formElem.type === 'htmlarea') {
        renderFn = __appendHTMLArea;
    } else if (formElem.type === 'htmlframe') {
        renderFn = __appendIFrame;
    } else if (formElem.type === 'button') {
        renderFn = __appendButton;
    } else if (formElem.type === 'buttonGroup') {
        renderFn = __appendButtonGroup;
    } else if (formElem.type === 'date' ||
               formElem.type === 'exactdate' ||
               formElem.type === 'datetime') {
        renderFn = __appendDate;
    } else if (formElem.type === 'tzSelector') {
        renderFn = __appendTZSelector;
    } else if (formElem.type == 'dialog') {        
        var elemIdx;
        for (elemIdx = 0; elemIdx < formElem.controls.length; ++elemIdx) {
            var subElem = formElem.controls[elemIdx];
            Helix.Utils.layoutFormElement(formLayout, subElem, parentDiv, page, useMiniLayout);
        }

        /* Add a button to submit the dialog. */
        var buttonTitle = formElem.dialogSubmitTitle;
        if (!buttonTitle) {
            buttonTitle = formElem.dialogTitle;
        }
        
        $('<div />').attr({
            'class' : 'ui-block-b'
        }).append($('<button />').attr({
            'data-theme' : 'b',
            'type' : 'submit'
            }).append(buttonTitle)
              .button()
              .on('tap', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (formElem.dialogSubmit) {
                        formElem.dialogSubmit(parentDiv);
                    }
                    $.mobile.changePage(formElem.doneLink, {});
                })
        )
        .appendTo(parentDiv);
        separateElements = false;
    } else if (formElem.type == 'hidden') {
        if ($editFieldContainer) {
            /* Edit. */
            if (!formElem.name) {
                /* No field name. We cannot include this field in the form. */
                return;
            }
            
            $editFieldContainer.append($('<input />').attr({
                    'name': formElem.name,
                    'type': 'hidden',
                    'value': formElem.value
            }));
        }
        separateElements = false;
    } else if (formElem.type == 'upload') {
        if ($editFieldContainer) {
            /* For desktop use only! Create an HTML5 uploader. */
            var styleClass = formElem.computedStyleClass;
            if (!styleClass) {
                styleClass = '';
            }

            /* Append a span with a message indicating what the user should do. */
            $('<span/>').attr({
                'class' : styleClass
            }).append(formElem.fieldTitle)
                .appendTo($editFieldContainer);   

            var uploadId = Helix.Utils.getUniqueID();
            var uploadDiv= $('<div/>').attr({
                'id' : uploadId,
                'class' : "mh-uploads"
            }).appendTo($editFieldContainer);


            $(page).on('pagecreate', function() {
               var dropbox = $editFieldContainer;
               dropbox.filedrop(uploadDiv, {
                    // The name of the $_FILES entry:
                    paramname:'file',

                    maxfiles: 1,
                    maxfilesize: 20, // in mb
                    url: formElem.options.url,
                    headers: formElem.options.headers,
                    
                    /* '/clientws/sharepoint/upload' */
                    /*
                     * {
                        'listUUID' : currentList.uuidName,
                        'siteURL' : currentSite.siteURL
                        }
                     */

                    uploadFinished:function(i,file,response){
                        Helix.Utils.statusMessage("Upload Complete", response.msg, "info");
                    },

                    error: function(err, file) {
                        switch(err) {
                            case 'BrowserNotSupported':
                                Helix.Utils.statusMessage('Unsupported Operation', 'Your browser does not support HTML5 file uploads!', 'severe');
                                break;
                            case 'TooManyFiles':
                                Helix.Utils.statusMessage('Error', 'Too many files! Please select 1 at most!', 'severe');
                                break;
                            case 'FileTooLarge':
                                Helix.Utils.statusMessage(file.name+' is too large! Please upload files up to 2mb.');
                                break;
                            default:
                                break;
                        }
                    },

                    // Called before each upload is started
                    beforeEach: function(file){
                        if (!formElem.name) {
                            this.headers['fileName'] = file.name;
                        } else {
                            this.headers['fileName'] = formElem.name;
                        }
                    }
                });           
            });
        }   
    } else if (formElem.type == "image") {
       if ($viewFieldContainer) {
           styleClass = "";
           if (formElem.computedStyleClass) {
               styleClass = formElem.computedStyleClass;
           }
           if (!formElem.target) {
               formElem.target = "";
           }
           
           /* Only show images in view mode. */
           var surroundingDiv = $('<div/>').attr({
               'class' : styleClass
           }).appendTo($viewFieldContainer);
           
           var imgTag = $('<img/>').attr({
               'src': formElem.src,
               'width' : formElem.width,
               'height' : formElem.height,
               'style' : formElem.computedStyle,
               'alt' : formElem.name,
               'title' : formElem.name,
               'target' : formElem.target
           });
           var txtElem = $('<span/>').attr({ 'style' : 'float:left' }).append('Tap to open ' + formElem.name);
           if (formElem.link) {
               surroundingDiv.append($('<a/>').attr({
                   'href' : formElem.link
               }).append(imgTag).append(txtElem));
           } else if (formElem.click) {
               $(imgTag).on('tap', function(e) {
                   formElem.click.apply(this, [e]);
               });
               surroundingDiv.append(imgTag).append(txtElem);
           } else {
               surroundingDiv.append(imgTag).append(txtElem);
           }
           $(imgTag).load(function() {
               $(txtElem).hide();
           });
       }
    } else if (formElem.type == 'horizontalScroll') {
        renderFn = __appendHorizontalScroll;
    } else if (formElem.type === 'subPanel') {
        renderFn = __appendSubPanel;
    } else {
        separateElements = false;
    }
    
    if ($viewFieldContainer) {
        if (renderFn) {
            renderFn.call(formElem, 0, formLayout, formElem, $viewFieldContainer, useMiniLayout, page, parentDiv);
        }
        if (currentMode === 'edit') {
            $viewFieldContainer.hide();
        }
    }
    if ($editFieldContainer) {
        if (renderFn) {
            renderFn.call(formElem, 1, formLayout, formElem, $editFieldContainer, useMiniLayout, page, parentDiv);
        }
        if (currentMode === 'view') {
            $editFieldContainer.hide();
        }
    }
    
    if (separateElements) {
        formElem.SEPARATOR = $('<hr />').insertAfter(formElem.editDOM ? formElem.editDOM : formElem.viewDOM);
    }
    if (formElem.hidden && formElem.DOM) {
        $(formElem.DOM).hide();
        if (formElem.SEPARATOR) {
            // Hide the HR.
            $(formElem.SEPARATOR).hide();
        }
    } else if (formElem.DOM) {
        $(formElem.DOM).show();
        if (formElem.SEPARATOR) {
            $(formElem.SEPARATOR).show();
        }
    }
}

function __preprocessFormLayout(formLayout) {
   formLayout.computedFieldStyleClass = '';
    if (formLayout.fieldStyleClass) {
        if (!Helix.Utils.isString(formLayout.fieldStyleClass)) {
            formLayout.computedFieldStyleClass = 
                (formLayout.fieldStyleClass[Helix.deviceType] ?  formLayout.fieldStyleClass[Helix.deviceType] : formLayout.fieldStyleClass['default']);
        } else {
            formLayout.computedFieldStyleClass = formLayout.fieldStyleClass;
        }
    }
    
    formLayout.computedFieldStyle = '';
    if (formLayout.fieldStyle) {
        if (!Helix.Utils.isString(formLayout.fieldStyle)) {
            formLayout.computedFieldStyle = 
                (formLayout.fieldStyle[Helix.deviceType] ?  formLayout.fieldStyle[Helix.deviceType] : formLayout.fieldStyle['default']);
        } else {
            formLayout.computedFieldStyle = formLayout.fieldStyle + ";";
        }
    }
    
    formLayout.__layoutFrames = [];
    formLayout.__tabIndex = 1;
}

/**
 * 0 for view mode; 1 for edit mode.
 */
Helix.Utils.nSubPanels = 0;
Helix.Utils.dynamicDialogs = {};
Helix.Utils.layoutForm = function(parentDiv, formLayout, page, useMiniLayout) {
    __preprocessFormLayout(formLayout);
    if (!page) {
        page = $.mobile.activePage;
    }
    
    // Clear out whatever is currently inside of the parent div.
    $(parentDiv).empty();
    
    var formElem;
    var elemIdx;
    var formElements = formLayout.items;
    for (elemIdx = 0; elemIdx < formElements.length; ++elemIdx) {
        formElem = formElements[elemIdx];
        Helix.Utils.layoutFormElement(formLayout, formElem, parentDiv, page, useMiniLayout);
    }
}

Helix.Utils.createDialog = function(dialogFields, dialogName, dialogTitle, page, useMiniLayout) {
    var dialogId = Helix.Utils.getUniqueID();
    var dialogObj = Helix.Utils.dynamicDialogs[dialogName];
    var isCreated = false;
    if (!dialogObj) {
        dialogObj = Helix.Utils.dynamicDialogs[dialogName] = {
            'id' : dialogId,
            'page' : $('<div />').attr({
                'data-role' : 'page',
                'id' : dialogId,
                'data-history' : false
            }).append($('<div />').attr({
                'data-role' : 'header',
                'data-position' : 'fixed'
                }).append($('<h1 />')
                    .append(dialogTitle)
                ).append($('<a />').attr({
                    'data-iconpos' : 'left',
                    'data-icon' : 'back',
                    'class' : 'ui-btn-left',
                    'href' : PrimeFaces.escapeClientId($(page).attr('id'))
                    }).append('Back')
                )
            ).append($('<div />').attr({
                'data-role' : 'content',
                'style' : 'overflow-y: auto;',
                'class' : 'hx-main-content'
                }).append($('<form />'))
            ),
            'fields' : dialogFields
        };
        isCreated = true;
    }
    
    if (!isCreated) {
        Helix.Utils.refreshDialogValues(dialogFields, dialogObj, null);
    } else {
        var dialogForm = $(dialogObj.page).find('form'); 
        $(dialogForm).empty();
        $(dialogForm).data("DIALOG", dialogFields);
        $(dialogForm).width($.mobile.activePage.width());
        dialogFields.doneLink = PrimeFaces.escapeClientId($.mobile.activePage.attr('id'));
        dialogFields.mode = true; /* Edit mode. */
        dialogFields.separateElements = false; /* Do not separate elements. */
        $(dialogObj.page).appendTo($.mobile.pageContainer);

        //initialize the new page 
        //$.mobile.initializePage();

        $(dialogObj.page).page();
        //$(dialogObj.page).trigger("pagecreate");

        Helix.Utils.layoutForm(dialogForm, dialogFields, dialogObj.page, useMiniLayout);
    }
    
    return dialogObj;
}

Helix.Utils.refreshDialogValues = function(dialogFields, dialogObj, refreshDone) {
    var dialogForm = $(dialogObj.page).find('form');
    
    var idx = 0;
    for (idx = 0; idx < dialogFields.items.length; ++idx) {
        var formElem = dialogFields.items[idx];
        var inputElem = $(dialogForm).find("[name='" + formElem.name + "']");
        if (inputElem) {
            if (formElem.type === "htmlarea") {
                $(inputElem).text(formElem.value);
                $(inputElem).data("cleditor").refresh();
            } else if (formElem.type === "date") {
                //$(inputElem).datebox('setDate', new Date(parseInt(formElem.value)));
                var dateValue;
                if (!formElem.value) {
                    dateValue = Date.now();
                } else {
                    dateValue = parseInt(formElem.value);
                    dateValue = new Date(dateValue);
                }
                $(inputElem).trigger('datebox', {'method':'set', 'value': dateValue}).trigger('datebox', {'method':'doset'});
            } else if (formElem.type === "text" ||
                       formElem.type === "hidden") {
                $(inputElem).attr('value', formElem.value);
            }
        }
    }
    if (refreshDone) {
        refreshDone();
    }
}

Helix.Layout.createConfirmDialog = function(options) {
    if (options.onclick && !options.onclick()) {
        return;
    }
    
    var popupId = Helix.Utils.getUniqueID();
    var popup = $('<div/>').attr({
        'data-role' : 'popup',
        'id' : popupId,
        'data-overlay-theme' : 'a',
        'data-theme' : 'c',
        'data-position-to' : 'window',
        'data-history' : 'false',
        'style' : 'max-width: 300px'
    });
    
    var closebtn = $('<a/>').attr({
        'href' : 'javascript:void(0)',
        'data-role' : 'button',
        'data-inline' : 'true',
        'data-theme' : 'c',
        'id' : popupId + "_close"
    });
    if (options.dismissText) {
        $(closebtn).append(options.dismissText);
    } else {
        $(closebtn).append("Dismiss");
    }
    if (options.ondismiss) {
        $(document).on('tap', PrimeFaces.escapeClientId(popupId + "_close"), function(e) {
            e.preventDefault();
            options.ondismiss();
            $(popup).popup("close");
        });
    } else {
        $(document).on('tap', PrimeFaces.escapeClientId(popupId + "_close"), function(e) {
            e.preventDefault();
            $(popup).popup("close");
        });
    }
    
    var confirmbtn = $('<a/>').attr({
        'href' : 'javascript:void(0)',
        'data-role' : 'button',
        'data-inline' : 'true',
        'data-theme' : 'b',
        'id' : popupId + "_open"
    });
    if (options.confirmText) {
        $(confirmbtn).append(options.confirmText);
    } else {
        $(confirmbtn).append("Confirm");
    }
    if (options.onconfirm) {
        $(document).on('tap', PrimeFaces.escapeClientId(popupId + "_open"), function(e) {
            e.preventDefault();
            options.onconfirm();
            $(popup).popup("close");
        });
    } else {
        $(document).on('tap', PrimeFaces.escapeClientId(popupId + "_open"), function(e) {
            e.preventDefault();
            $(popup).popup("close");
        });
    }
    
    var titleStyleClass = options.titleStyleClass ? options.titleStyleClass : 'dialog-title';
    var header = $("<div/>").attr({
        'data-role' : 'header',
        'class' : titleStyleClass
    }).append($('<h1/>').append(options.title));
    
    
    $(popup)
        .append(header)
        .append($('<div/>').attr({
            'data-role' : 'content',
            'data-theme' : 'd',
            'class' : 'ui-corner-bottom ui-content'
        })
            .append($('<p/>').append(options.message))
            .append(closebtn)
            .append(confirmbtn)
    );
    
    $(document).on("popupafterclose", PrimeFaces.escapeClientId(popupId), function() {
        $(this).remove();
    });				

    // Create the popup. Trigger "pagecreate" instead of "create" because currently the framework doesn't bind the enhancement of toolbars to the "create" event (js/widgets/page.sections.js).
    $.mobile.activePage.append( popup ).trigger( "pagecreate" );
    $(popup).popup("open");
    $(window).on('navigate.popup', function (e) {
        e.preventDefault();
        $(window).off('navigate.popup');
    });
}