'use strict';

var util = require('util');
var stringify = require('json-stringify-safe');
var lengthKey = '__length__';

module.exports = function(session) {
  var Store = session.Store;

  function MedeaSessionStore(db, opts) {
    db = db || 'medea-session-store';
    opts = opts || {};
    Store.call(this, opts);
    this.mungeKey = false;
    this.storeName = opts.ns || '_session';

    if (typeof db === 'string') {
      this._createDB(db, opts);
    } else {
      this.mungeKey = true;
      this.db = db;
    }
  }

  util.inherits(MedeaSessionStore, Store);

  MedeaSessionStore.prototype._createDB = function(name, opts) {
    opts = opts || {};
    var self = this;

    try {
      var medea = require('medea');
    } catch (err) {
      throw new Error('If you are not passing in an existing medea instance, you must have the package medea installed. ' + err.message);
    }

    this.db = medea();
    this.db.open(name, function(err) {
      if (err) {
        throw err;
      }

      var key = self.getKey(lengthKey);
      self.db.get(key, function(err, length) {
        length = parseInt(length, 10) || 0;
        self.db.put(key, length);
        self.emit('connect');
      });
    });
  };

  MedeaSessionStore.prototype.getKey = function(key) {
    if (this.mungeKey) {
      return [this.storeName, key].join('/');
    }
    return key;
  };

  MedeaSessionStore.prototype.get = function(sid, cb){
    this.db.get(this.getKey(sid), function(err, data) {
      if (err && err.type !== 'NotFoundError') {
        return cb(err);
      }
      var session;

      if (data) {
        try {
          session = JSON.parse(data);
        } catch (err) {
          return cb(err);
        }
      }

      cb(null, session);
    });
  };

  MedeaSessionStore.prototype.set = function(sid, session, cb){
    var self = this;
    session = stringify(session);
    this.db.get(this.getKey(lengthKey), function(err, len) {
      len = parseInt(len, 10) || 0;
      var batch = self.db.createBatch();
      batch.put(self.getKey(sid), session);
      batch.put(self.getKey(lengthKey), ++len);
      self.db.write(batch, cb);
    });
  };

  MedeaSessionStore.prototype.destroy = function(sid, cb){
    var self = this;
    this.db.get(this.getKey(lengthKey), function(err, len) {
      len = parseInt(len, 10) || 0;
      var batch = self.db.createBatch();
      batch.remove(self.getKey(sid));
      batch.put(self.getKey(lengthKey), --len);
      self.db.write(batch, cb);
    });
  };

  MedeaSessionStore.prototype.touch = function(sid, session, cb){
    session = stringify(session);
    this.db.put(this.getKey(sid), session, function(err) {
      cb && cb(err);
    });
  };

  MedeaSessionStore.prototype.length = function(cb){
    this.db.get(this.getKey(lengthKey), function(err, len) {
      return cb(err, parseInt(len, 10) || 0);
    });
  };

  MedeaSessionStore.prototype.clear = function(cb){
    var self = this;
    var total = 0;
    var count = 0;
    var streamDone = false;

    var done = function() {
      ++count;
      if (count === total && streamDone) {
        cb && cb();
      }
    };
    this.db.listKeys(function(keys){
      for(var i = 0; i < keys.length; i++){
        if(self.mungeKey && keys[i].indexOf(self.storeName) === 0) {
          self.db.remove(keys[i], done);
        }
      }
      self.db.put(self.getKey(lengthKey), 0, function() {
        streamDone = true;
        done();
      });
    });
  };

  return MedeaSessionStore;
};
