(function ($) {

    //==============
    // jQuery Plugin
    //==============

    $.widget('helix.editor', {
        // Define the defaults used for all new cleditor instances
        options: {
            defaultFont: 'Calibri',
            defaultFontSize: 11,
            placeholderText: 'Compose a rich text document',
            extraButtons: [],
            extraButtonsPhone: null,
            editorReady: null,
            tabIndex: 0
        },
        pendingActions: [],
        initDone: false,
        _create: function () {            
            this._isDirty = false;
            this._initialVal = '';
            var _extraButtons = this.options.extraButtons;
            if (Helix.deviceType === 'phone' && this.options.extraButtonsPhone) {
                _extraButtons = this.options.extraButtonsPhone;
            }
            var _self = this;
            var e = this.editor = new FroalaEditor('#' + this.element.attr('id'), {
                toolbarSticky: false,
                events: {
                    'contentChanged': function () {
                      // Do something here.
                      // this is the editor instance.
                      _self._isDirty = true;
                    }
                },
                tabIndex: _self.options.tabIndex,
                placeholderText: _self.options.placeholderText,
                fontFamilyDefaultSelection: _self.options.defaultFont,
                fontFamilySelection: true,
                fontSizeSelection: true,
                fontSizeDefaultSelection: _self.options.defaultFontSize.toString(),
                fontSizeUnit: 'pt',
                fontFamily: {
                    'Arial,Helvetica,sans-serif': 'Arial',
                    'Calibri,sans-serif': 'Calibri',
                    'Cambria,serif': 'Cambria',
                    'Comic Sans MS': 'Comic Sans MS',
                    'Courier New': 'Courier',
                    'Georgia,serif': 'Georgia',
                    'Impact,Charcoal,sans-serif': 'Impact',
                    'Tahoma,Geneva,sans-serif': 'Tahoma',
                    "'Times New Roman',Times,serif": 'Times New Roman',
                    'Trebuchet MS': 'Trebuchet',
                    'Verdana,Geneva,sans-serif': 'Verdana'
                },
                toolbarButtonsXS: {
                    'moreText': {
                        'buttons': ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'fontFamily', 'fontSize', 'textColor', 'backgroundColor', 'clearFormatting'], // 'inlineClass', 'inlineStyle', 
                        'buttonsVisible': 0
                    },
                    'moreParagraph': {
                        'buttons': ['alignLeft', 'alignCenter', 'formatOLSimple', 'alignRight', 'alignJustify', 'formatOL', 'formatUL', 'paragraphFormat', 'paragraphStyle', 'lineHeight', 'outdent', 'indent', 'quote'],
                        'buttonsVisible': 0
                    },
                    'moreRich': {
                        'buttons': ['insertLink', 'insertTable', 'fontAwesome', 'specialCharacters', 'insertHR'], // 'insertImage', 'insertVideo', 'embedly', 'insertFile', 'emoticons', 
                        'buttonsVisible': 0
                    },
                    'extraButtons': {
                        'buttons' : _extraButtons,
                        'buttonsVisible': _extraButtons.length,
                        'align': 'right'
                    }
                },
                toolbarButtons: {
                    'moreText': {
                        'buttons': ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'fontFamily', 'fontSize', 'textColor', 'backgroundColor', 'clearFormatting'], // 'inlineClass', 'inlineStyle', 
                        'buttonsVisible': 0
                    },
                    'moreParagraph': {
                        'buttons': ['alignLeft', 'alignCenter', 'formatOLSimple', 'alignRight', 'alignJustify', 'formatOL', 'formatUL', 'paragraphFormat', 'paragraphStyle', 'lineHeight', 'outdent', 'indent', 'quote'],
                        'buttonsVisible': 0
                    },
                    'moreRich': {
                        'buttons': ['insertLink', 'insertTable', 'fontAwesome', 'specialCharacters', 'insertHR'], // 'insertImage', 'insertVideo', 'embedly', 'insertFile', 'emoticons', 
                        'buttonsVisible': 0
                    },
                    'moreMisc': {
                      'buttons': ['undo', 'redo', 'selectAll' ], // 'fullscreen', 'print', 'getPDF', 'html', 'help', 'spellChecker', 'selectAll'
                      'buttonsVisible': 3
                    },
                    'extraButtons': {
                        'buttons' : _self.options.extraButtons,
                        'buttonsVisible': _self.options.extraButtons.length,
                        'align': 'right'
                    }
                },
                quickInsertEnabled: false,
                colorsHEXInput: false,
                tableResizerOffset: 10,
                tableResizingLimit: 50,
                heightMin: 200,
                key: '4NC5fE4G5A3A3D3B3B-16UJHAEFZMUJOYGYQEa2d2ZJd1RAeF3C8B5A4E3C3A2G3A15A12=='
            }, function() {
                _self.initDone = true;
                e.html.set(_self._initialVal);
                _self.element.find('.fr-toolbar').addClass('hx-form-border-none');
                _self.element.find('.second-toolbar').addClass('hx-form-hidden');
                _self.element.find('.fr-view').css('font-family', _self.options.defaultFont)
                        .css('font-size', _self.options.defaultFontSize + e.opts.fontSizeUnit);
                for (var i = 0; i < _self.pendingActions.length; ++i) {
                    var _fn = _self.pendingActions[i];
                    _fn.call(_self);
                }
                if (_self.options.editorReady) {
                    _self.options.editorReady.call(_self);
                }
            });
        },
        isDirty: function () {
            return this._isDirty;
        },
        // clear - clears the contents of the editor
        clear: function () {
            if (!this.editor.html) {
                this._initialVal = '';
                return;
            }
            this.editor.html.set('');
        },
        reset: function() {
            this.clear();
            if (this.editor.popups) {
                this.editor.popups.hideAll();
            }
        },
        setDefaultFont: function(font, fontSize) {
            this.options.defaultFont = font;
            this.options.defaultFontSize = fontSize;
        },
        update: function (val) {
            if (!this.editor.html) {
                this._initialVal = val;
                return;
            }
            
            // Strip out closing br tags that cause unnecessary spaces ...
            val = val.replace(/<\/br>/g, '');
            
            this.editor.html.set(val);
        },
        focus: function () {
            this.editor.focus();
        },
        // disable - enables or disables the editor
        disable: function (disabled) {
        },
        getHTML: function () {
            return '<html><body><style type="text/css">' + FROALA_HTML_STYLES + '</style><div class="fr-view">' + this.editor.html.get() + '</div></body></html>';
        },
        blur: function () {
            this.getContentParent().blur();
        },
        getFrame: function() {
            return this.element;
        },
        getContentParent: function() {
            return this.getFrame().find('.fr-view');
        },
        getContentClone: function() {
            var contentParent = this.getContentParent()[0].cloneNode(true);
            var outerHTML = document.implementation.createHTMLDocument();
            var css = document.createElement('style');
            css.type = 'text/css';
            css.innerHTML = FROALA_HTML_STYLES;
            
            outerHTML.body.appendChild(contentParent);
            outerHTML.getElementsByTagName('head')[0].appendChild(css);
            return outerHTML;
        },
        refreshButtons: function() {
            if (this.initDone !== true) {
                this.pendingActions.push(function() {
                    this.refreshButtons();
                });
                return;
            }
            this.editor.button.bulkRefresh();
        }
    });

    /* https://www.fileformat.info/info/unicode/char/1f4ce/index.htm */
    var FROALA_HTML_STYLES = '.clearfix::after{clear:both;display:block;content:"";height:0}.hide-by-clipping{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0, 0, 0, 0);border:0}img.fr-rounded,.fr-img-caption.fr-rounded img{border-radius:10px;-moz-border-radius:10px;-webkit-border-radius:10px;-moz-background-clip:padding;-webkit-background-clip:padding-box;background-clip:padding-box}img.fr-bordered,.fr-img-caption.fr-bordered img{border:solid 5px #CCC}img.fr-bordered{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box}.fr-img-caption.fr-bordered img{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}.fr-view{word-wrap:break-word}.fr-view span[style~="color:"] a{color:inherit}.fr-view strong{font-weight:700}.fr-view table{border:none;border-collapse:collapse;empty-cells:show;max-width:100%}.fr-view table td{min-width:5px}.fr-view table.fr-dashed-borders td,.fr-view table.fr-dashed-borders th{border-style:dashed}.fr-view table.fr-alternate-rows tbody tr:nth-child(2n){background:whitesmoke}.fr-view table td,.fr-view table th{border:1px solid #DDD}.fr-view table td:empty,.fr-view table th:empty{height:20px}.fr-view table td.fr-highlighted,.fr-view table th.fr-highlighted{border:1px double red}.fr-view table td.fr-thick,.fr-view table th.fr-thick{border-width:2px}.fr-view table th{background:#ececec}.fr-view hr{clear:both;user-select:none;-o-user-select:none;-moz-user-select:none;-khtml-user-select:none;-webkit-user-select:none;-ms-user-select:none;break-after:always;page-break-after:always}.fr-view .fr-file{position:relative}.fr-view .fr-file::after{position:relative;content:"&#128206;";font-weight:normal}.fr-view pre{white-space:pre-wrap;word-wrap:break-word;overflow:visible}.fr-view[dir="rtl"] blockquote{border-left:none;border-right:solid 2px #5E35B1;margin-right:0;padding-right:5px;padding-left:0}.fr-view[dir="rtl"] blockquote blockquote{border-color:#00BCD4}.fr-view[dir="rtl"] blockquote blockquote blockquote{border-color:#43A047}.fr-view blockquote{border-left:solid 2px #5E35B1;margin-left:0;padding-left:5px;color:#5E35B1}.fr-view blockquote blockquote{border-color:#00BCD4;color:#00BCD4}.fr-view blockquote blockquote blockquote{border-color:#43A047;color:#43A047}.fr-view span.fr-emoticon{font-weight:normal;font-family:"Apple Color Emoji","Segoe UI Emoji","NotoColorEmoji","Segoe UI Symbol","Android Emoji","EmojiSymbols";display:inline;line-height:0}.fr-view span.fr-emoticon.fr-emoticon-img{background-repeat:no-repeat !important;font-size:inherit;height:1em;width:1em;min-height:20px;min-width:20px;display:inline-block;margin:-.1em .1em .1em;line-height:1;vertical-align:middle}.fr-view .fr-text-gray{color:#AAA !important}.fr-view .fr-text-bordered{border-top:solid 1px #222;border-bottom:solid 1px #222;padding:10px 0}.fr-view .fr-text-spaced{letter-spacing:1px}.fr-view .fr-text-uppercase{text-transform:uppercase}.fr-view .fr-class-highlighted{background-color:#ffff00}.fr-view .fr-class-code{border-color:#cccccc;border-radius:2px;-moz-border-radius:2px;-webkit-border-radius:2px;-moz-background-clip:padding;-webkit-background-clip:padding-box;background-clip:padding-box;background:#f5f5f5;padding:10px;font-family:"Courier New", Courier, monospace}.fr-view .fr-class-transparency{opacity:0.5}.fr-view img{position:relative;max-width:100%}.fr-view img.fr-dib{margin:5px auto;display:block;float:none;vertical-align:top}.fr-view img.fr-dib.fr-fil{margin-left:0;text-align:left}.fr-view img.fr-dib.fr-fir{margin-right:0;text-align:right}.fr-view img.fr-dii{display:inline-block;float:none;vertical-align:bottom;margin-left:5px;margin-right:5px;max-width:calc(100% - (2 * 5px))}.fr-view img.fr-dii.fr-fil{float:left;margin:5px 5px 5px 0;max-width:calc(100% - 5px)}.fr-view img.fr-dii.fr-fir{float:right;margin:5px 0 5px 5px;max-width:calc(100% - 5px)}.fr-view span.fr-img-caption{position:relative;max-width:100%}.fr-view span.fr-img-caption.fr-dib{margin:5px auto;display:block;float:none;vertical-align:top}.fr-view span.fr-img-caption.fr-dib.fr-fil{margin-left:0;text-align:left}.fr-view span.fr-img-caption.fr-dib.fr-fir{margin-right:0;text-align:right}.fr-view span.fr-img-caption.fr-dii{display:inline-block;float:none;vertical-align:bottom;margin-left:5px;margin-right:5px;max-width:calc(100% - (2 * 5px))}.fr-view span.fr-img-caption.fr-dii.fr-fil{float:left;margin:5px 5px 5px 0;max-width:calc(100% - 5px)}.fr-view span.fr-img-caption.fr-dii.fr-fir{float:right;margin:5px 0 5px 5px;max-width:calc(100% - 5px)}.fr-view .fr-video{text-align:center;position:relative}.fr-view .fr-video.fr-rv{padding-bottom:56.25%;padding-top:30px;height:0;overflow:hidden}.fr-view .fr-video.fr-rv>iframe,.fr-view .fr-video.fr-rv object,.fr-view .fr-video.fr-rv embed{position:absolute !important;top:0;left:0;width:100%;height:100%}.fr-view .fr-video>*{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;max-width:100%;border:none}.fr-view .fr-video.fr-dvb{display:block;clear:both}.fr-view .fr-video.fr-dvb.fr-fvl{text-align:left}.fr-view .fr-video.fr-dvb.fr-fvr{text-align:right}.fr-view .fr-video.fr-dvi{display:inline-block}.fr-view .fr-video.fr-dvi.fr-fvl{float:left}.fr-view .fr-video.fr-dvi.fr-fvr{float:right}.fr-view a.fr-strong{font-weight:700}.fr-view a.fr-green{color:green}.fr-view .fr-img-caption{text-align:center}.fr-view .fr-img-caption .fr-img-wrap{padding:0;margin:auto;text-align:center;width:100%}.fr-view .fr-img-caption .fr-img-wrap img{display:block;margin:auto;width:100%}.fr-view .fr-img-caption .fr-img-wrap>span{margin:auto;display:block;padding:5px 5px 10px;font-size:14px;font-weight:initial;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;-webkit-opacity:0.9;-moz-opacity:0.9;opacity:0.9;-ms-filter:"progid:DXImageTransform.Microsoft.Alpha(Opacity=0)";width:100%;text-align:center}.fr-view button.fr-rounded,.fr-view input.fr-rounded,.fr-view textarea.fr-rounded{border-radius:10px;-moz-border-radius:10px;-webkit-border-radius:10px;-moz-background-clip:padding;-webkit-background-clip:padding-box;background-clip:padding-box}.fr-view button.fr-large,.fr-view input.fr-large,.fr-view textarea.fr-large{font-size:24px}a.fr-view.fr-strong{font-weight:700}a.fr-view.fr-green{color:green}img.fr-view{position:relative;max-width:100%}img.fr-view.fr-dib{margin:5px auto;display:block;float:none;vertical-align:top}img.fr-view.fr-dib.fr-fil{margin-left:0;text-align:left}img.fr-view.fr-dib.fr-fir{margin-right:0;text-align:right}img.fr-view.fr-dii{display:inline-block;float:none;vertical-align:bottom;margin-left:5px;margin-right:5px;max-width:calc(100% - (2 * 5px))}img.fr-view.fr-dii.fr-fil{float:left;margin:5px 5px 5px 0;max-width:calc(100% - 5px)}img.fr-view.fr-dii.fr-fir{float:right;margin:5px 0 5px 5px;max-width:calc(100% - 5px)}span.fr-img-caption.fr-view{position:relative;max-width:100%}span.fr-img-caption.fr-view.fr-dib{margin:5px auto;display:block;float:none;vertical-align:top}span.fr-img-caption.fr-view.fr-dib.fr-fil{margin-left:0;text-align:left}span.fr-img-caption.fr-view.fr-dib.fr-fir{margin-right:0;text-align:right}span.fr-img-caption.fr-view.fr-dii{display:inline-block;float:none;vertical-align:bottom;margin-left:5px;margin-right:5px;max-width:calc(100% - (2 * 5px))}span.fr-img-caption.fr-view.fr-dii.fr-fil{float:left;margin:5px 5px 5px 0;max-width:calc(100% - 5px)}span.fr-img-caption.fr-view.fr-dii.fr-fir{float:right;margin:5px 0 5px 5px;max-width:calc(100% - 5px)}';
})(jQuery);
