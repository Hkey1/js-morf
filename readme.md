Fast English and Russian morfology for node.js and browsers.

# Size

| lang    | code | words  | forms | bytes |
|--------:|:----:|--------|-------|-------|
| english | en   | 104K   | 173K  | 1.4M  |
| russian | ru	 | 174K   | 3M    | 23M   |

# Install

## Node.js

```
  npm install serpstat-morf
```
```javascript
  var SerpstatMorf = require('serpstat-morf');
```

## Browser

```html
   <script src="https://cdn.jsdelivr.net/npm/serpstat-morf/morf.js" charset="UTF-8"></script>
```

# Usage

```javascript
	SerpstatMorf.init('ru en').then(function(lib){
		console.log('has       = ',lib.find('has'));
		console.log('have      = ',lib.find('have'));
		console.log('have==has = ',lib.isSameWord('have','has'));
	});
```