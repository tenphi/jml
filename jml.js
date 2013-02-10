/*
    JML by Andrey Yamanov <tenphi@gmail.com>

    Licensed under MIT
*/

(function(jml, undefined) {

    var noClose = jml.noClose = ['base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source'];

    /* utils */

    var utils = jml.utils = {};

    var type = utils.type = (function() {
        var classToType, name, i, len, ref;
        classToType = {};
        ref = 'Boolean Number String Function Array Date Regexp Undefined Null'.split(' ');
        for (i = 0, len = ref.length; i < len; i++) {
            name = ref[i];
            classToType['[object ' + name + ']'] = name.toLowerCase();
        }
        return function type (obj) {
            return classToType[Object.prototype.toString.call(obj)] || 'object';
        };
    })();

    var isArray = utils.isArray = function isArray (arr) {
        return type(arr) === 'array';
    };

    var isObject = utils.isObject = function isObject (obj) {
        return type(obj) === 'object';
    };

    var isFunction = utils.isFunction = function isFunction (func) {
        return type(func) === 'function';
    };

    var isString = utils.isString = function isString (str) {
        return type(str) === 'string';
    };

    var isBoolean = utils.isBoolean = function isBoolean (bool) {
        return type(bool) === 'boolean';
    };

    var isNumber = utils.isNumber = function isNumber (bool) {
        return type(bool) === 'number';
    };

    var isNaN = utils.isNaN = function isNaN (num) {
        return num !== num;
    };

    var inArray = utils.inArray = function inArray (val, arr) {
        var i, len;
        if (arr.indexOf) {
            return arr.indexOf(val);
        } else {
            for (i = 0, len = arr.length; i < len; i++) {
                if (arr[i] == val) {
                    return i;
                }
            }
        }
        return -1;
    };

    var extend = utils.extend = function extend (obj, extObj) {
        if (arguments.length > 2) {
            for (var a = 1; a < arguments.length; a++) {
                extend(obj, arguments[a]);
            }
        } else {
            for (var i in extObj) {
                obj[i] = extObj[i];
            }
        }
        return obj;
    };

    var isPlainObject = utils.isPlainObject = function isPlainObject (obj) {
        if ( !obj || typeof(obj) !== "object" || obj.nodeType ) {
            return false;
        }

        try {
            if ( obj.constructor &&
                !Object.hasOwnProperty.call(obj, "constructor") &&
                !Object.hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf") ) {
                return false;
            }
        } catch ( e ) {
            return false;
        }

        var key;
        for ( key in obj ) {}

        return key === undefined || Object.hasOwnProperty.call( obj, key );
    };

    var applyState = utils.applyState = function applyState (obj, state) {
        var name, val, ret = {};
        for (name in obj) {
            val = obj[name];
            if (isFunction(val)) {
                ret[name] = val.apply(state, obj);
            } else if (isPlainObject(val)) {
                ret[name] = applyState(val, state);
            } else {
                ret[name] = val;
            }
        }
        return ret;
    };

    /* render utils */

    var renderUtils = {};

    var handleStyleName = function handleStyleName (name) {
        return name.replace(/[A-Z]/g, function(s) {
            return '-' + s.toLowerCase();
        });
    };

    var renderAttrs = renderUtils.attrs = function renderAttrs (attrs) {
        var out = '', val;
        for (var name in attrs) {
            val = attrs[name];
            if (isArray(val)) {
                val = val.join(' ');
            } else if (name === 'style' && isPlainObject(val)) {
                val = renderStyles(val);
            } else {
                val = '' + val;
            }
            out += ' ' + name + '="' + val + '"';
        }
        return out;
    };

    var renderStyles = renderUtils.styles = function renderStyles (styles) {
        var out = '', name, val;
        for (name in styles) {
            val = styles[name];
            if (isArray(val)) {
                for (var i = 0; i < val.length; i++) {
                    if (isString(val[i])) val[i].replace(/"/g, '');
                    out += handleStyleName(name) + ': ' + val[i] + '; ';
                }
            } else if (isArray(val)) {
                out += val.join(' ');
            } else {
                if (isString(val)) val.replace(/"/g, '');
                out += handleStyleName(name) + ': ' + val + '; ';
            }
        }
        return out;
    };

    /* main render */

    var render = jml.render = function render (arr, state, offset) {
        var out = '', i, len, elm, ret;
        state = state || {};

        if (!isArray(arr)) {
            return arr || '';
        }

        offset = offset || 0;
        for (i = offset, len = arr.length; i < len; i++) {
            elm = arr[i];
            if (elm === undefined) {
                continue;
            } else if (isFunction(elm)) {
                ret = elm.apply(state);
                out += render(ret, state);
            } else if (isString(elm) || isNumber(elm) || isBoolean(elm) || isNaN(elm)) {
                out += elm;
            } else if (isArray(elm)) {
                out += renderTag(elm, state);
            }
        }
        return out;
    };

    var tagNameRegExp = /^([a-zA-Z][a-zA-Z0-9_\:\-]*)$/;

    var renderTag = render.tag = function renderTag (elm, state) {
        var offset = 1, styles = {}, attrs = {}, tag = elm[0], content;
        state = state || {};

        if (isFunction(tag)) {
            tag = tag.call(state);
        }

        tag = tag || 'div';
        if (!isString(tag) || !tagNameRegExp.test(tag)) {
            throw {
                message: 'wrong tag name',
                tag: tag
            };
        }

        if (isPlainObject(elm[1])) {
            attrs = applyState(elm[1], state);
            offset++;
        }

        content = render(elm, state, offset);
        attrs = renderAttrs(attrs);

        if (~inArray(tag, noClose)) {
            return '<' + tag + attrs + ' />';
        } else {
            return '<' + tag + attrs + '>' + content + '</' + tag + '>';
        }

    };

    extend(render, renderUtils);

    /* simple template creation */

    var view = jml.view = function view (view) {
        if (!isArray(view)) {
            throw {
                message: 'view not valid',
                view: view
            }
        }
        return function jmlView(state) {
            return render(view, state);
        };
    };

})(typeof(exports) === 'undefined' ? this.jml = {} : exports, undefined);
