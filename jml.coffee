###
JML - Javascript template engine
@copyright Yamanov Andrey <tenphi@gmail.com>
@version 0.5
###

type = do ->
    classToType = {}
    for name in 'Boolean Number String Function Array Date Regexp Undefined Null'.split(' ')
        classToType['[object ' + name + ']'] = name.toLowerCase()

    (obj) ->
        classToType[Object::toString.call(obj)] or 'object'

isArray = (arr) ->
    type(arr) is 'array'

isObject = (obj) ->
    type(obj) is 'object'

isFunction = (func) ->
    type(func) is 'function'

isString = (str) ->
    type(str) is 'string'

isBoolean = (bool) ->
    type(bool) is 'boolean'

extend = (obj) ->
    for i in [1...arguments.length]
        extObj = arguments[i]
        for name, value of extObj
            obj[name] = value
    obj

inArray = (val, arr) ->
    if arr.indexOf
        return arr.indexOf(val)
    for val2, i in arr
        if val is val2
            return i
    -1

clone = (obj) ->
    temp = {}
    for name, value of obj
        if isObject value
            temp[name] = clone(value)
        else
            temp[name] = value
    temp

cloneWithState = (obj, state) ->
    temp = {}
    flag = false
    for name, value of obj
        if isFunction value
            if name is '_'
                flag = true
                delete obj['_']
                extend temp, value.apply(state)
                continue
            flag = true
            value = value.apply(state)
        if name is '_'
            extend temp, value
            flag = true
            delete obj['_']
            continue
        temp[name] = value
    if flag then temp else obj

isEmptyObject = (obj) ->
    flag = true
    for i of obj
        flag = false
        break;
    return flag

handleName = (name) ->
    name.replace /[A-Z]/g, (s) ->
        '-' + s.toLowerCase()

isServer = typeof global isnt 'undefined'
isClient = !isServer

init = () ->

    jml = (args...) ->
        jml.render.apply jml, args

    ### Defined Templates ###
    jml.views = {}

    ### Template name pattern ###
    jml.viewNamePattern = /^[A-Z][A-Za-z0-9_\.]*$/

    ### Tags that not containers ###
    jml.noClose = ['base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source']

    ### ID Prefix ###
    jml.idPrefix = if typeof window is undefined then 's' else 'c'

    ### injector ###
    jml.injector = (elm, state, id) ->
        return ''

    ### id generator ###
    counter = 0
    jml.generateId = ->
        return jml.idPrefix + (++counter)

    originalState = {}

    if isServer
        jml.loadView = (file) ->
            fs = require 'fs'
            try
                data = fs.readFileSync file, 'utf-8'
                if file.slice(-4) is '.cml'
                    coffee = require 'coffee-script'
                    return coffee.eval data
                else
                    return eval data
            catch e
                console.log 'Can\'t load template file `' + file + '`'
                console.log e
                return []
    if isClient
        jml.loaded = {}
        jml.load = (url, callback) ->
            if jml.loaded[url]
                setTimeout (->
                    callback? null, jml.loaded[url]
                ), 1
                return jml
            req = new XMLHttpRequest()
            req.open 'GET', url, true
            req.onreadystatechange = ->
                if req.readyState isnt 4
                    return
                try
                    template = eval req.responseText
                    jml.loaded[url] = template
                    callback? template
                catch e
                    console?.log? e
            do req.send
            jml
                    
    jml.view = (name, view, state) ->
        if !view and isString(name)
            if jml.views[name]
                return jml.views[name]
            return
        if isServer
            if isString(name) and isString(view)
                file = view
                view = jml.loadView file
            else if isString(name) and isObject(view)
                file = name
                view = jml.loadView file
                name = ''
            
        if isArray name
            [view, state] = [name, view]
            name = ''
        if name and !name.match @viewNamePattern
            throw 'jml: Wrong template name: ' + name
        if !isArray view
            throw 'jml: Wrong view (not array). type - ' + typeof view
        view.state = state

        renderer = (state) ->
            state = extend clone(renderer.state or {}), state
            jml.renderArray renderer.view, state

        renderer.optimized = no
        renderer.optimize = ->
            renderer.view = jml.optimize renderer.view
            renderer.optimized = yes
            renderer

        renderer.view = view
        renderer.state = state
        if (name)
            renderer.viewName = name
            jml.views[name] = renderer

        renderer.serialize = () ->
            sourin = require 'sourin'
            'jml.view(' + (if renderer.viewName then '"' + renderer.viewName + '", ' else '') +
                sourin(renderer.view, yes) +
                (if renderer.state then ', ' + sourin(renderer.state, yes) else '') +
                ');'
        
        renderer.saved = no
        renderer.save = (file) ->
            fs = require 'fs'
            fs.writeFileSync file, @.serialize(), 'utf-8'
            renderer.saved = file
            @

        watcher = ->
            renderer.view = jml.loadView file
        if file
            fs = require 'fs'
            renderer.watch = ->
                fs.watchFile file, persistent: yes, watcher
                do renderer.optimize if renderer.optimized
                renderer.save(saved) if renderer.saved
                renderer.watching = yes
                renderer
            renderer.unwatch = ->
                fs.unwatchFile file, watcher
                renderer.watching = no
                renderer
        renderer

    if isServer
        saveAll = jml.saveAll = (file) ->
            if not names
                names = (name for name of jml.views)
            data = ''
            return if not names.length
            for name in names
                data += jml.views[name].serialize() + '\n'
            fs = require 'fs'
            fs.writeFileSync file, data, 'utf-8'
            jml

    optimize = jml.optimize = (view) ->
        view = optimizeArray view
        optimizeNormalize view

    optimizeNormalize = optimizeNormalize = (view, offset) ->
        view2 = []
        offset ?= 0
        for elm, i in view
            if isArray(elm) and elm[0] is ''
                elm = optimizeNormalize(elm, 2)
                view2 = view2.concat(elm.slice(1))
            else
                view2.push(elm)

        for i in [offset...view2.length]
            while i and isString(view2[i]) and isString(view2[i-1])
                view2.splice i-1, 2, view2[i-1] + view2[i]
                
        return view2

    optimizeArray = jml.optimizeArray = (view) ->
        if isString view
            return view
        view2 = []
        for elm, i in view
            if elm is undefined
                continue
            if isFunction elm
                view2.push elm
            else if isArray elm
                view2.push optimizeTag elm
            else
                view2.push elm
        view2

    optimizeTag = jml.optimizeTag = (view) ->
        if isString view
            return view
        if isFunction view[0]
            if isObject view[1]
                return [view[0], view[1]].concat optimizeArray view[2...]
            else
                return [view[0]].concat optimizeArray view[1...]
        offset = 1
        view2 = []
        op = view[0]
        flag = false
        if jml.view[op]
            return view

        view2.push op
        sec = view[1]
        if isObject sec
            offset = 2
            sec2 = cloneWithState(sec)
            if sec2 isnt sec
                flag = true
            view2.push sec

        if !flag
            out = jml.renderTag([view2..., '""""'])
            temp = out.split('""""')
            view2 = [''].concat temp[0], optimizeArray(view[offset...]) or [], temp[1] or []
        else
            view2 = view2.concat optimizeArray view[offset...]

        view2

    renderAttrs = jml.renderAttrs = (attrs) ->
        out = ''
        for name, value of attrs
            out += ' ' + name + (if value then '="' + attrs[name] + '"' else '')
        out

    renderStyles = jml.renderStyles = (styles) ->
        out = []
        for name, list of styles
            name = handleName(name)
            if !isArray list
                list = [list]
            for val in list
                out.push name + ': ' + val + ';'
        out.join ' '

    render = jml.render = (arr, state, offset) ->
        return renderArray arr, state, offset

    renderArray = jml.renderArray = (arr, state, offset) ->
        out = ''
        if !isArray arr
            if !arr
                return ''
            else
                return arr
        offset ?= 0
        for i in [offset...arr.length]
            elm = arr[i]
            if elm is undefined
                continue
            if isFunction elm
                ret = elm.apply(state)
                out += jml.renderArray ret, state
            else if isString elm
                out += elm
            else
                out += renderTag elm, state
        out

    renderTag = jml.renderTag = (elm, state) ->
        offset = 1
        op = elm[0] or ''
        if !op
            return renderArray elm, state, 1
        if isFunction op
            op = op.call(state)
        out = ''
        state ?= {}
        # defined template
        if jml.views[op]
            viewState = {}
            if isObject elm[1]
                offset = 2
                extend viewState, cloneWithState(elm[1], state)
            content = elm[offset...]
            if content.length
                viewState.content = renderArray content, state
            return jml.views[op] viewState

        i1 = op.indexOf('#')
        i2 = op.indexOf('.')
        f1 = ~i1
        f2 = ~i2
        len = op.length
        tag = op[0...(f1 and i1) or (f2 and i2) or len]
        if f1 then id = op[i1+1...(f2 and i2) or len]
        if f2 then classes = op[i2+1...len]

        if classes and isString classes
            classes = classes.split '.'
        if !classes then classes = []

        attrs = {}
        if id is '%'
            injector = true
            id = jml.generateId()
        if id
            attrs.id = id
        if classes.length
            attrs.class = classes.join ' '

        styles = {}
        if isObject elm[1]
            offset = 2
            sec = cloneWithState(elm[1], state)
            for name, value of sec
                if (name.charAt(0) is '_')
                    attrs[handleName(name[1...])] = value
                else
                    styles[name] = value
        
        if !isEmptyObject styles
            attrs.style = renderStyles(styles)
        if !isEmptyObject attrs
            attrs = renderAttrs(attrs)
        else
            attrs = ''

        if ~inArray tag, jml.noClose
            out += '<' + tag + attrs + ' />'
        else
            content = renderArray(elm, state, offset)
            out += '<' + tag + attrs + '>' +
                content +
                '</' + tag + '>'
        if injector
            out += jml.injector(elm, originalState, id)
        out

    jml.prop = (name, def) ->
        return if @[name] isnt undefined then @[name] else def

    #jml.allTags = ["a","abbr","acronym","address","applet","area","article","aside","audio","b","base","basefont","bdi","bdo","big","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","command","datalist","dd","del","details","dfn","dir","div","dl","dt","em","embed","fieldset","figcaption","figure","font","footer","form","frame","frameset","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","iframe","img","input","ins","kbd","keygen","label","legend","li","link","map","mark","menu","meta","meter","nav","noframes","noscript","object","ol","optgroup","option","output","p","param","pre","progress","q","rp","rt","ruby","s","samp","script","section","select","small","source","span","strike","strong","style","sub","summary","sup","table","tbody","td","textarea","tfoot","th","thead","time","title","tr","track","tt","u","ul","var","video","wbr"]
    #
    #glob = if global? then global else if window? then window
    #if (glob)
    #    globTags = false
    #    jml.global = (bool) ->
    #        if bool isnt undefined
    #            globTags = bool
    #        else
    #            return globTags 
    #        if bool
    #            for tag in jml.allTags
    #                do (tag) ->
    #                    func = (args...) ->
    #                        [tag, args...]
    #                    glob['$' + tag] = func
    #            glob.$doctype = (type = 'html') -> '<!doctype ' + type + '>'
    #        else
    #            for tag in jml.allTags
    #                delete glob['$' + tag]
    #            delete glob.doctype
    #        jml
    
    jml

if typeof global isnt 'undefined'
    module.exports = init()
else if typeof window isnt 'undefined'
    window.jml = init()
