# Medea-Session-Store
A session storage module for [expressjs/session](https://github.com/expressjs/session) that uses [medea/medea](https://github.com/medea/medea) to store data.

## Installation

`npm install --save medea-session-store`

## Usage

```js
var app = require('express')();
var session = require('express-session');
var MedeaStore = require('medea-session-store')(session);
var mw = session({
  store: new MedeaStore()
});
app.use(mw);
```

So long as you have medea installed (it is listed as a peerDependency) this will create a new medea db and use it for storing sessions.

You don't like the default location it puts it?

```js
var app = require('express')();
var session = require('express-session');
var MedeaStore = require('medea-session-store')(session);
var mw = session({
  store: new MedeaStore('/path/to/where/you/want/it')
});
app.use(mw);
```

You already have a level instance you want it to use?  Not a problem.

```js
var app = require('express')();
var session = require('express-session');
var MedeaStore = require('medea-session-store')(session);
var mw = session({
  store: new LevelStore(myMedeaInstance)
});
app.use(mw);
```

This will invoke "name munging" -- the keys for session stuff will prefixed with `_session`. You don't like that munging?

```js
var app = require('express')();
var session = require('express-session');
var MedeaStore = require('medea-session-store')(session);
var mw = session({
  store: new MedeaStore(myMedeaInstance, {ns: '_sessionsAreRadicalToTheExtreme'})
});
app.use(mw);
```

## License

Copyright 2022 Benjamin VADANT. Available under the MIT license.

Base on Scripto's package level-session-store
