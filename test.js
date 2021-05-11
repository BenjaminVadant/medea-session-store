const os = require('os');
const path = require('path');
const axios = require('axios');
const tap = require('tap');

const { test } = tap;
const express = require('express');
const session = require('express-session');
const rimraf = require('rimraf');
const cookieParser = require('cookie-parser');
const Store = require('.')(session);

const app = express();
const store = new Store(path.join(os.tmpdir(), 'medea-session-store'));
const noPermPath = path.join(os.tmpdir(), 'noperms');

store.on('connect', () => {
  // we wait for the medea instance to be ready
  const mw = session({
    store,
    key: 'sid',
    secret: 'foobar',
    resave: true,
    saveUninitialized: true,
    unset: 'destroy',
  });

  const server = app
    .use(cookieParser())
    .use(mw)
    .get('/', (req, res) => {
      if (typeof req.session === 'undefined') {
        res.status(500).send('no');
      } else {
        res.send('ok');
      }
    })
    .get('/bye', (req, res) => {
      req.session.destroy();
      res.send('ok');
    })
    .get('/nuke', (req, res) => {
      store.destroy(req.cookies.sid, () => {
        res.send();
      });
    })
    .listen(1234);

  test('it stores session', (t) => {
    axios.get('http://localhost:1234/')
      .then((res) => {
        t.ok(res.headers['set-cookie'], 'setting a cookie');
        store.length((err, len) => {
          t.notOk(!!err, 'no errors');
          t.equal(len, 1, 'there is a session');
          t.end();
        });
      })
      .catch((err) => {
        t.notOk(!!err, 'no errors');
      });
  });

  test('it deletes a session', (t) => {
    axios.get('http://localhost:1234/')
      .then((res) => {
        t.ok(res.headers['set-cookie'], 'setting a cookie');

        const cookieVal = res.headers['set-cookie'][0].split('%3A')[1].split('.')[0];

        return axios.get(
          'http://localhost:1234/bye',
          {
            headers: {
              Cookie: `sid=${cookieVal}`,
            },
          },
        );
      })
      .then(() => {
        store.length((err, len) => {
          t.notOk(!!err, 'no errors');
          t.equal(len, 1, 'there is a session');
          t.end();
        });
      })
      .catch((err) => {
        t.notOk(!!err, 'no errors');
      });
  });

  test('it returns a falsy value when getting a non-existing session', (t) => {
    const testStore = new Store(path.join(os.tmpdir(), 'foo'));
    testStore.on('connect', () => {
      testStore.get('bar', (err, sessionData) => {
        t.notOk(!!err, 'no errors');
        t.notOk(sessionData, 'session was falsy');
        t.end();
      });
    });
  });

  test('deleting the session from the store works', (t) => {
    axios.get('http://localhost:1234/')
      .then((res) => {
        t.ok(res.headers['set-cookie'], 'setting a cookie');

        const cookieVal = res.headers['set-cookie'][0].split('%3A')[1].split('.')[0];

        return axios.get(
          'http://localhost:1234/nuke',
          {
            headers: {
              Cookie: `sid=${cookieVal}`,
            },
          },
        );
      })
      .then((res) => {
        t.equal(res.status, 200, 'got 200');

        return axios.get('http://localhost:1234/');
      })
      .then((res) => {
        t.equal(res.status, 200, 'got 200');

        t.end();
      })
      .catch((err) => {
        t.notOk(!!err, 'no errors');
      });
  });

  test('clearing the store works', (t) => {
    store.clear(() => {
      store.length((err, length) => {
        t.notOk(!!err, 'no errors');
        t.equal(length, 0, 'store empty');
        t.end();
      });
    });
  });

  test('teardown', (t) => {
    rimraf.sync(path.join(os.tmpdir(), 'medea-session-store'));
    rimraf.sync(path.join(os.tmpdir(), 'foo'));
    rimraf.sync(noPermPath);
    server.close();
    t.end();
  });
});
