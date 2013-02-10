JML
===

Data-driven content generation library

## Getting started
Install via NPM...

```
$ npm install jml
```

... or add script to your web page.

```html
<script type="text/javascript" src="/path/to/jml.js"></script>
```

... or install script via bower and add via requirejs.

```bash
bower install git://github.com/tenphi/jml.git
```

```javascript
require(['./components/jml/jml'], function(jml) {
  jml.render(/* view *//*, state */);
});
```

## Simple usage

```javascript
jml.render([
  ['div', 
    { class: 'container' },
    ['a', {
      class: 'link', 
      href: 'http://tenphi.me'
    }, 'Link text'],
    ['img', {
      src: '/myphoto.jpg', 
      alt: '', 
      style: {
        width: '100px'
      }
    }]
  ]
]);
```

output:

```html
<div class="container"><a class="link" href="http://tenphi.me">Link text</a><img src="/myphoto.jpg" alt="" style="width: 100px; " /></div>
```

### Render with state
Create template:

```javascript
var link = jml.view([
  ['a', {
    href: 'http://tenphi.me',
    target: function() {
      return this.target;
    }
  }, function() {
    return this.body;
  }]
]);
```

and render it with state:

```javascript
link({
  body: 'link',
  target: '_blank'
});
```

output:

```html
<a href="http://tenphi.me" target="_blank">text</a>
```
