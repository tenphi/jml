var render = require('../lib/jml.js').render;
var fs = require('fs');

module.exports = {
    oneTag: {
        simple: function (test) {
            var view = [['p']];
            test.equal(render(view), '<p></p>', 'Simple tag');
            test.done();
        },
        simpleEmpty: function (test) {
            var view = [['br']];
            test.equal(render(view), '<br />', 'Simple empty tag');
            test.done();
        }
    },
    manyTags: function (test) {
        var view = [['p'], ['p']];
        test.equal(render(view), '<p></p><p></p>', '');
        test.done();
    },
    enclosed: function (test) {
        var view = [['p', ['p', 'text']]];
        test.equal(render(view), '<p><p>text</p></p>', 'Simple enclosed');
        test.done();
    },
    attrs: function (test) {
        var view = [['div', {width: 100, class: ['class1', 'class2'], id: 'id'}, 'inner text']];
        test.equal(render(view), '<div width="100" class="class1 class2" id="id">inner text</div>', 'Attributes');
        test.done();
    },
    styles: function (test) {
        var view = [['p', {style: {width: '100px', height: '100px'}}, 'inner text']];
        test.equal(render(view), '<p style="width: 100px; height: 100px; ">inner text</p>', 'Styles');
        test.done();
    },
    state: {
        tag: function (test) {
            var view = [[function() {
                return this.tag;
            }]];
            test.equal(render(view, {tag: 'div'}), '<div></div>', 'Tag by state');
            test.done();
        },
        attrs: function (test) {
            var view = [['div', {
                class: function() {
                    return this.class;
                }
            }]];
            test.equal(render(view, {class: 'class'}), '<div class="class"></div>', 'Attributes by state');
            test.done();
        },
        styles: function (test) {
            var view = [['div', {
                style: {
                    width: function() {
                        return this.width + 'px';
                    }
                }
            }]];
            test.equal(render(view, {width: 100}), '<div style="width: 100px; "></div>', 'Style by state');
            test.done();
        },
        content: function (test) {
            var view = [['div', function() {
                return this.content;
            }]];
            test.equal(render(view, {content: 'inner text'}), '<div>inner text</div>', 'Content by state');
            test.done();
        }
    },
    complex: function (test) {
        var view = [
            ['a', {
                href: 'http://tenphi.me',
                target: function() {
                    return this.target || '';
                },
                style: {
                    color: function() {
                        return this.color || 'red';
                    }
                }
            }, function() {
                return this.inner;
            }, ' text'],
            ['p',
                ['i', 'text']
            ]
        ];
        test.equal(render(view, {
            color: 'blue',
            inner: 'inner',
            target: '_blank'
        }), '<a href="http://tenphi.me" target="_blank" style="color: blue; ">inner text</a><p><i>text</i></p>', 'Complex test');
        test.done();
    }
};
