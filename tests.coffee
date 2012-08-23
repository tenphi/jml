fs = require 'fs'
jml = require './jml.coffee'

module.exports =
    oneTag: 
        simple: (test) ->
            template = [
                ['tag']
            ]
            rendered = '<tag></tag>'
            test.strictEqual jml(template), rendered, 'Tag'

            template = [
                ['meta']
            ]
            rendered = '<meta />'
            test.strictEqual jml(template), rendered, 'No-closed tag'

            template = [
                ['tag#id']
            ]
            rendered = '<tag id="id"></tag>'
            test.strictEqual jml(template), rendered, 'Tag with id'

            template = [
                ['tag.class']
            ]
            rendered = '<tag class="class"></tag>'
            test.strictEqual jml(template), rendered, 'Tag with class'

            template = [
                ['tag'
                    _attr: 'value'
                ]
            ]
            rendered = '<tag attr="value"></tag>'
            test.strictEqual jml(template), rendered, 'Tag with attribute'

            template = [
                ['tag'
                    style: 'value'
                ]
            ]
            rendered = '<tag style="style: value;"></tag>'
            test.strictEqual jml(template), rendered, 'Tag with style'

            do test.done

        full: (test) ->
            template = [
                ['tag#id.class1.class2'
                    _attr1: 'value1'
                    _attr2: 'value2'
                    style1: 'value1'
                    style2: 'value2'
                ]
            ]
            rendered = '<tag id="id" class="class1 class2" attr1="value1" attr2="value2" style="style1: value1; style2: value2;"></tag>'
            test.strictEqual jml(template), rendered, 'Full options'

            template = [
                ['tag'
                    _id: 'id'
                    _class: 'class1 class2'
                    _attr1: 'value1'
                    _attr2: 'value2'
                    style1: 'value1'
                    style2: 'value2'
                ]
            ]
            test.strictEqual jml(template), rendered, 'Full options alternative'
            do test.done
    nestedTags: (test) ->
        template = [
                ['tag1'
                    ['tag2']
                ]
            ]
        rendered = '<tag1><tag2></tag2></tag1>'
        test.strictEqual jml(template), rendered, 'Nested tags'
        do test.done
    tagWithOptions:
        tag: (test) ->
            template = [[-> @tag]]
            rendered = '<tag></tag>'
            test.strictEqual jml(template, tag: 'tag'), rendered, 'Optional tag name'
            do test.done
        attributes: (test) ->
            template = [['tag', _id: -> @id]]
            rendered = '<tag id="id"></tag>'
            test.strictEqual jml(template, id: 'id'), rendered, 'Optional attribute'

            template = [['tag', _: -> @attrs]]
            rendered = '<tag id="id"></tag>'
            test.strictEqual jml(template, attrs: {_id: 'id'}), rendered, 'Optional attribute alternative'
            do test.done
        contentSingle: (test) ->
            template = [['tag', -> @content]]
            rendered = '<tag>content</tag>'
            test.strictEqual jml(template, content: 'content'), rendered, 'Tag content'
            do test.done
        contentMultiple: (test) ->
            template = [['tag', -> @content]]
            rendered = '<tag>content<tag2></tag2></tag>'
            test.strictEqual jml(template, content: ['content', ['tag2']]), rendered, 'Tag content'
            do test.done
    namedTemplate:
        define: (test) ->
            defaultState = {param1: 'value1', param2: 'value4'}
            view = [['tag', -> @param1 + @param2 + @param3]]
            template = jml.view 'Test', view, defaultState
            test.strictEqual template.state, defaultState, 'State the same'
            test.strictEqual template.view, view, 'State the view'
            test.strictEqual template, jml.views.Test, 'Template in jml storage'
            do test.done
        render: (test) ->
            template = jml.views.Test
            rendered = '<tag>value1value2value3</tag>'
            test.strictEqual template(param2: 'value2', param3: 'value3'), rendered, 'Template render'
            do test.done
    optimize: (test) ->
        view = [
            ['tag1'
                _attr1: 'value1'
                ['tag2'
                    _attr2: 'value2'
                    -> @title
                ]
            ]
        ]
        template = jml.view 'Test', view
        template.optimize()
        test.strictEqual template.view[0], '<tag1 attr1="value1"><tag2 attr2="value2">', 'Left part optimized'
        test.strictEqual template.view[2], '</tag2></tag1>', 'Right part optimized'
        do test.done
    serialize: (test) ->
        expect = 'jml.view("Test", [\'<tag1 attr1="value1"><tag2 attr2="value2">\',function(){return this.title},"</tag2></tag1>"]);'
        data = jml.views.Test.serialize()
        test.strictEqual data, expect, 'Serialize template'
        do test.done
    save:
        one: (test) ->
            expect = 'jml.view("Test", [\'<tag1 attr1="value1"><tag2 attr2="value2">\',function(){return this.title},"</tag2></tag1>"]);'
            jml.views.Test.save __dirname + '/template.js'
            data = fs.readFileSync __dirname + '/template.js', 'utf-8'
            test.strictEqual data, expect, 'Check saved template'
            fs.unlinkSync __dirname + '/template.js'
            do test.done
        all: (test) ->
            expect = 'jml.view("Test", [\'<tag1 attr1="value1"><tag2 attr2="value2">\',function(){return this.title},"</tag2></tag1>"]);\n'
            jml.views.Test2 = jml.views.Test
            jml.saveAll __dirname + '/template.js'
            data = fs.readFileSync __dirname + '/template.js', 'utf-8'
            test.strictEqual data, expect + expect, 'Check saved templates'
            fs.unlinkSync __dirname + '/template.js'
            do test.done
    load:
        jml: (test) ->
            template = jml.loadView __dirname + '/sample.jml'
            test.equal template[0][0], 'tag:jml', 'Load JML template'
            do test.done
        cml: (test) ->
            template = jml.loadView __dirname + '/sample.cml'
            test.equal template[0][0], 'tag:cml', 'Load CML template'
            do test.done
    get: (test) ->
        template = jml.view 'Test'
        test.ok template?.view?.length, 'Renderer have view'
        test.done()