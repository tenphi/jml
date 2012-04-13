/*!
* JML
* Copyright(c) 2012 Andrey Yamanov <tenphi@gmail.com>
* MIT Licensed
* @version 0.3.5
*/

(function() {

var init = (function() {

    var extend = function(obj, extObj) {
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
        },
        clone = function clone(obj){
            if(obj == null || typeof(obj) != 'object')
                return obj;

            var temp = obj.constructor();

            for(var key in obj)
                temp[key] = clone(obj[key]);
            return temp;
        },
        unique = function(arr) {
            arr = clone(arr).sort();
            for (var i = 0; i < arr.length; i++) {
                if (i && arr[i-1] === arr[i]) {
                    arr.splice(i,1);
                }
            }
            return arr;
        },
        inArray = function(val, arr) {
            for (var i = 0, len = arr.length; i < len; i++) {
                if (arr[i] === val) {
                    return i;
                }
            }
            return -1;
        },
        map = function(elems, callback, arg) {
            var ret = [], value;
            if (isArray(elems)) {
                for(var i = 0, len = elems.length; i < len; i++) {
                    value = callback(elems[i], i, arg);
                    if (value != null) {
                        ret.push(value);
                    }
                }
            } else if (isPlainObject(elems)) {
                for (var name in elems) {
                    value = callback(elems[name], name, arg);
                    if (value != null) {
                        ret.push(value);
                    }
                }
            } else {
                return elems;
            }
            
            return ret.concat.apply([], ret);
        },
        isArray = Array.isArray || function(arr) {
            return arr instanceof Array;
        },
        isFunction = function(func) {
            return typeof(func) === 'function';
        },
        isNumeric = function(num) {
            return typeof(num) === 'number';
        },
        isPlainObject = function( obj ) {
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
        },
        isEmptyObject = function(obj) {
            if (typeof(obj) !== 'object') {
                return true;
            }
            var flag = true;
            for (var key in obj) {
                flag = false;
                break;
            }
            return flag;
        },
        isString = function(value) {
            return typeof(value) === 'string';
        },
        getArgs = function(args) {
            return Array.prototype.slice.apply(args);
        },
        getByPath = function getByPath(obj, path) {
            if (!path.length) {
                return '';
            }
            if (path.length == 1) {
                return obj[path[0]];
            }
            var last = path.pop();
            while (path.length) {
                var name = path.shift();
                obj = obj[name];
                if (obj === undefined) {
                    return '';
                }
            }
            return obj[last];
        };

    var jml = {};
    var gid = 0;

    jml.views = {};
    
    jml.cache = {};
    
    jml.noClose = ['base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source'];

    jml.view = function(name, view, state) {
        if (!name || typeof(name) !== 'string') {
            throw 'jml: wrong view name; type - ' + typeof name;
        }
        if (!isArray(view)) {
            throw 'jml: wrong view (not array) type - ' + typeof view;
        }
        view.state = state;
        view.name = name;
        jml.views[name] = view;
    };

    jml.render = function render(template, state, context) {
        if (!isArray(template)) return template;
        var out = '';
        template.forEach(function(elm) {
            elm = jml.handle(elm, state);
            out += jml.renderElement(elm, context);
        });
        return out;
    };
    
    jml.parseTag = function parseTag(tag) {
        if (jml.cache[tag])
            return clone(jml.cache[tag]);
        var params = tag.match(/^([a-zA-Z0-9_-]*|\&|)(#([a-zA-Z0-9_\-]*)|)(\.([a-zA-Z0-9_\-\.]*)|)$/);
        if (!params)
            throw 'jml: wrong element for parsing; type - ' + typeof tag;
        var info = {
            tag: params[1],
            id: params[3] ? params[3] : '',
            classes: params[5] ? params[5].split('.') : []
        };
        jml.cache[tag] = info;
        return clone(jml.cache[tag]);
    };

    jml.parseElement = function parseElement(elm) {
        if (!isArray(elm) || !elm[0])
            throw 'jml: wrong element for parsing; type - ' + typeof elm;
        var info = isPlainObject(elm[0]) ? elm[0] : jml.parseTag(elm[0]);
        var attrs = {};
        
        var hasOptions = isPlainObject(elm[1]);
        if (hasOptions) {
            for (var name in elm[1]) {
                if (name.charAt(0) == '_') {
                    attrs[jml.handleName(name.substring(1))] = elm[1][name];
                    delete elm[1][name];
                }
            }
        }
        var offset = hasOptions ? 2 : 1;
        var content = elm.slice(offset);
        return {
            tag: info.tag,
            id: info.id || '',
            classes: info.classes || [],
            attrs: attrs,
            styles: hasOptions ? elm[1] : {},
            content: content
        };
    };

    jml.renderElement = function renderElement(elm, context) {
        var name, state, view, i, fake;
        
        if (!context)
            context = '';
        
        if (typeof(elm) == 'string')
            return elm;
        
        if (jml._jQuery && elm instanceof jml._jQuery)
            return elm.clone().wrap('<div>').parent().html();
        
        if (!isArray(elm))
            return elm;
        
        if (typeof elm[0] === 'string' && elm[0].match(/^[A-Z][a-zA-Z0-9\.]*$/)) {
            /* view */
            var temp = {};
            temp.sid = elm[0];
            if (isPlainObject(elm[1])) {
                temp.state = elm[1];
                temp.content = elm.slice(2);
            } else {
                temp.state = {};
                temp.content = elm.slice(1);
            }
            elm = temp;
        } else {
            /* element */
            elm = jml.parseElement(elm);
        }
        var out = '';
        if (elm.sid) {
            name = jml.findViewName(elm.sid, context ? context : undefined);
            view = jml.views[name];
            if (view) {
                state = view.state ? clone(view.state) : {};
                state = extend(state, elm.state);
                var id = '';
                
                if (elm.content.length) state.content = elm.content;
                view = jml.handle(view, state, view.name);
                elm = jml.parseElement(view);
                
                elm.content = jml.handle(elm.content, state);
                
                if (elm.id) {
                    id = elm.id;
                } else if (jml.trigger) {
                    id = 'jml-client-view-' + gid++;
                    fake = true;
                }
                elm.id = id;
                
                elm.classes.push(jml.name2class(name));
            } else {
                throw 'pattern `' + name + '` not found';
            }
        }
        
        if (!isEmptyObject(elm.styles)) {
            var jcss = (typeof(window) !== 'undefined' && window.jcss) || (typeof(jml._jQuery) !== 'undefined' && jml._jQuery.jcss);
            if (jcss) {
                for (var style in elm.styles) {
                    if (jcss.mixins[style]) {
                        var styles = jcss.mixins[style](elm.styles[style]);
                        if (!styles[style]) {
                            delete elm.styles[style];
                        } else {
                            elm.styles[style] = styles[style];
                            delete styles[style];
                        }
                        for (var style2 in styles) {
                            if (!elm.styles[style2]) elm.styles[style2] = [];
                            if (!isArray(elm.styles[style2])) {
                                elm.styles[style2] = [elm.styles[style2]];
                            }
                            elm.styles[style2].push(styles[style2]);
                        }
                    }
                }
            }
            elm.attrs['style'] = jml.renderStyles(elm.styles);
        }
        
        if (elm.classes.length) {
            elm.classes = unique(elm.classes);
            elm.attrs['class'] = elm.classes.join(' ');
        }
        if (elm.id) {
            elm.attrs['id'] = elm.id;
        }
        
        if (!elm.tag) {
            throw 'Tag name not set; element type - ' + typeof elm;
        }
        if (!~inArray(elm.tag, jml.noClose)) {
            out += '<' + elm.tag + jml.renderAttrs(elm.attrs) + '>';
            for ( i = 0; i < elm.content.length; i++) {
                if (typeof(elm.content[i]) == 'string') {
                    out += elm.content[i];
                } else {
                    out += jml.renderElement(elm.content[i], context);
                }
            }
            out += '</' + elm.tag + '>';
        } else {
            out += '<' + elm.tag + jml.renderAttrs(elm.attrs) + ' />';
        }
        if (state && jml.trigger) out += jml.trigger(name, state, id, fake);
        return out;
    };

    jml.handle = function handle(view, state) {
        if (!isArray(view)) return view;
        var env = getArgs(arguments).slice(2);
        var nview = [];
        for (var i = 0; i < view.length; i++) {
            if (isArray(view[i])) {
                nview.push(jml.handle.apply(this, [view[i], state].concat(env)));
                continue;
            }
            if (!isFunction(view[i])) {
                nview.push(view[i]);
                continue;
            }
            var hview = view[i].apply(state, env);
            if (!isArray(hview)) {
                hview = [hview];
            }
            hview = jml.handle.apply(this, [hview, state].concat(env));
            nview = nview.concat(hview);
        }
        return nview;
    };

    jml.renderAttrs = function renderAttrs(attrs) {
        var out = '';
        for (var name in attrs) {
            out += ' ' + name + '="' + attrs[name] + '"';
        }
        return out;
    };

    jml.renderStyles = function renderStyles(styles) {
        var out = '';
        for (var name in styles) {
            if (isArray(styles[name])) {
                for (var i = 0; i < styles[name].length; i++) {
                    if (isString(styles[name][i])) styles[name][i].replace(/"/g, '');
                    out += jml.handleName(name) + ': ' + styles[name][i] + '; ';
                }
            } else {
                if (isString(styles[name])) styles[name].replace(/"/g, '');
                out += jml.handleName(name) + ': ' + styles[name] + '; ';
            }
        }
        return out;
    };
    
    jml.handleName = function handleName(name) {
        return name.replace(/[A-Z]/g, function(s) {
            return '-' + s.toLowerCase();
        });
    };
    
    jml.findViewName = function findViewName(name, context) {
        return name;
    };
    
    jml.trigger = function trigger(name, state, id) {
        return '';
    };
    
    jml.name2class = function name2class(name) {
        return name.toLowerCase().replace(/\./g, '-');
    };
    
    /* JML Tools */
    
    jml.prop = function prop (name, def) {
        if (!def) def = '';
        var path = name.split('.');
        if(path[1]) {
            return function () {
                return getByPath(this, [].concat(path));
            };
        }
        return function () {
            return this[name] !== undefined ? this[name] : def;
        };
    };
    
    jml.map = function jmlMap (name, handler) {
        return function () {
            if (!isArray(this[name]) && !isPlainObject(this[name])) 
                return '';
            var self = this;
            return map(this[name], function() {
                return handler.apply(self, getArgs(arguments));
            });
        }
    };
    
    jml.filter = function () {
        var args = getArgs(arguments);
        return function () {
            var obj = {};
            for (var i = 0, len = args.length; i < len; i++) {
                var name = args[i];
                if (this[name] !== undefined)
                    obj[name] = this[name];
            }
            return obj;
        }
    };
    
    /* Setup plugin for jQuery */
    
    jml.jQuery = function ($) {
        if (!$) {
            return jml._jQuery;
        } else {
            jml._jQuery = $;
        }
        
        $.jml = jml;
        
        $.fn.render = function(view, state, place) {
            if (isString(state)) {
                place = state;
                state = {};
            }
            if (!state) {
                state = {};
            }
            if (!place || !isString(place)) place = 'instead';

            var html = jml.render(view, state);

            switch(place) {
                case 'top':
                    this.prepend(html);
                    break;
                case 'bottom':
                    this.append(html);
                    break;
                case 'before':
                    this.before(html);
                    break;
                case 'after':
                    this.after(html);
                    break;
                default:
                    this.html(html);
                    break;
            }

            return this;
        };
        
        return jml;
    }
    
    return jml;
    
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    var jml = init();
	module.exports = jml;
} else {
	window.jml = init();
}

})();