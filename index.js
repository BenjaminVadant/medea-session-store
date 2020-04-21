const util = require('util');
const stringify = require('json-stringify-safe');

const lengthKey = '__length__';

module.exports = (session) => {
  const { Store } = session;

  function MedeaSessionStore(db = 'medea-session-store', opts = {}) {
    Store.call(this, opts);
    this.mungeKey = false;
    this.storeName = opts.ns || '_session';

    if (typeof db === 'string') {
      this._createDB(db);
    } else {
      this.mungeKey = true;
      this.db = db;
    }
  }

  util.inherits(MedeaSessionStore, Store);

  MedeaSessionStore.prototype._createDB = function _createDB(name) {
    const self = this;

    try {
      // eslint-disable-next-line global-require
      const medea = require('medea');
      this.db = medea();
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') {
        throw new Error(`If you are not passing in an existing medea instance, you must have the package medea installed. ${err.message}`);
      }
      throw err;
    }

    this.db.open(name, (err) => {
      if (err) {
        throw err;
      }

      const key = self.getKey(lengthKey);
      self.db.get(key, (error, length) => {
        self.db.put(
          key,
          Number.parseInt(length, 10) || 0,
        );
        self.emit('connect');
      });
    });
  };

  MedeaSessionStore.prototype.getKey = function getKey(key) {
    if (this.mungeKey) {
      return [this.storeName, key].join('/');
    }
    return key;
  };

  MedeaSessionStore.prototype.get = function get(sid, cb) {
    this.db.get(this.getKey(sid), (err, data) => {
      let error;
      let sessionData;

      if (err && err.type !== 'NotFoundError') {
        error = err;
      }

      if (data) {
        try {
          sessionData = JSON.parse(data);
        } catch (parseErr) {
          error = parseErr;
        }
      }

      cb(error, sessionData);
    });
  };

  MedeaSessionStore.prototype.set = function set(sid, sessionData, cb) {
    const self = this;
    this.db.get(this.getKey(lengthKey), (err, len) => {
      const batch = self.db.createBatch();

      batch.put(self.getKey(sid), stringify(sessionData));
      batch.put(self.getKey(lengthKey), (Number.parseInt(len, 10) || 0) + 1);

      self.db.write(batch, cb);
    });
  };

  MedeaSessionStore.prototype.destroy = function destroy(sid, cb) {
    const self = this;
    this.db.get(this.getKey(lengthKey), (err, len) => {
      const batch = self.db.createBatch();

      batch.remove(self.getKey(sid));
      batch.put(self.getKey(lengthKey), (Number.parseInt(len, 10) || 0) - 1);

      self.db.write(batch, cb);
    });
  };

  MedeaSessionStore.prototype.touch = function touch(sid, sessionData, cb) {
    this.db.put(this.getKey(sid), stringify(sessionData), (err) => {
      if (cb) {
        cb(err);
      }
    });
  };

  MedeaSessionStore.prototype.length = function length(cb) {
    this.db.get(this.getKey(lengthKey), (err, len) => cb(err, parseInt(len, 10) || 0));
  };

  MedeaSessionStore.prototype.clear = function clear(cb) {
    const self = this;
    let total = 0;
    let count = 0;
    let streamDone = false;

    const done = function done() {
      count += 1;
      if ((count >= total || streamDone) && cb) {
        cb();
      }
    };

    this.db.listKeys((err, keys) => {
      total = keys.length;
      for (let i = 0; i < keys.length; i += 1) {
        if (self.mungeKey && keys[i].indexOf(self.storeName) === 0) {
          self.db.remove(keys[i], done);
        }
      }
      self.db.put(self.getKey(lengthKey), 0, () => {
        streamDone = true;
        done();
      });
    });
  };

  return MedeaSessionStore;
};
