var assert = require('assert');

var DataSource = require('loopback-datasource-juggler').DataSource;
var ds = new DataSource(require('../lib/rest-connector'),
  {
    baseURL: 'http://localhost:3000',
    defaults: {
      headers: {
        'X-MY-HEADER': 'my-header'
      }
    }
  });

// simplier way to describe model
var User = ds.define('User', {
  name: String,
  bio: String,
  approved: Boolean,
  joinedAt: Date,
  age: Number
}, {plural: 'Users'});

ds.attach(User);

describe('REST connector', function () {
  describe('CRUD apis', function () {

    var server = null;
    before(function (done) {

      var app = require('./express-helper')();

      var count = 2;
      var users = [new User({id: 1, name: 'Ray'}), new User({id: 2, name: 'Joe'})]

      app.get('/Users', function (req, res, next) {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(users);
      });

      app.post('/Users', function (req, res, next) {
        res.setHeader('Content-Type', 'application/json');
        var body = req.body;
        if (!body.id) {
          body.id = (++count);
        }
        res.setHeader('Location', req.protocol + '://' + req.headers['host'] + '/' + body.id);
        users.push(body);
        res.status(201).json(body);
      });

      app.put('/Users/:id', function (req, res, next) {
        for (var i = 0; i < users.length; i++) {
          var user = users[i];
          if (user.id == req.params.id) {
            res.setHeader('Content-Type', 'application/json');
            users[i] = req.body;
            res.status(200).end();
            return;
          }
        }
        res.status(404).end();
      });

      app.delete('/Users/:id', function (req, res, next) {
        for (var i = 0; i < users.length; i++) {
          var user = users[i];
          if (user.id == req.params.id) {
            res.setHeader('Content-Type', 'application/json');
            users.splice(i, 1);
            res.status(200).end();
            return;
          }
        }
        res.status(404).end();
      });

      app.get('/Users/:id', function (req, res, next) {
        for (var i = 0; i < users.length; i++) {
          var user = users[i];
          if (user.id == req.params.id) {
            res.setHeader('Content-Type', 'application/json');
            user.myHeader = req.get('x-my-header');
            res.status(200).json(user);
            return;
          }
        }
        res.status(404).end();
      });

      server = app.listen(app.get('port'), function (err, data) {
        // console.log('Server listening on ', app.get('port'));
        done(err, data);
      });
    });

    after(function (done) {
      server && server.close(done);
    });

    it('should find two users', function (done) {

      User.find(function (err, body) {
        // console.log(body);
        assert.equal(2, body.length);
        done(err, body);
      });
    });

    var user1;
    it('should find the user with id 1', function (done) {
      User.findById(1, function (err, body) {
        // console.log(body);
        assert.equal(1, body.id);
        assert.equal('Ray', body.name);
        user1 = body;
        done(err, body);
      });
    });

    it('should honor defaults for request', function (done) {
      User.findById(1, function (err, body) {
        // console.log(body);
        assert.equal(1, body.id);
        assert.equal('my-header', body.myHeader);
        done(err, body);
      });
    });

    it('should not find the user with id 100', function (done) {
      User.findById(100, function (err, body) {
        // console.log(err, body);
        assert.ok(err);
        done(null, body);
      });
    });

    it('should update user 1', function (done) {
      user1.name = 'Raymond';
      user1.save(function (err, body) {
        // console.log(err, body);
        done(err, body);
      });
    });

    it('should delete user 1', function (done) {
      User.findById(1, function (err, body) {
        // console.log(body);
        assert.equal(1, body.id);
        assert.equal('Raymond', body.name);

        body.destroy(function (err, body) {
          // console.log(err, body);
          done(err, body);
        });
      });
    });

    it('should create a new id named Mary', function (done) {
      User.create({name: 'Mary'}, function (err, body) {
        // console.log(body);
        done(err, body);
      });
    });

    it('should list all users', function (done) {
      User.find(function (err, body) {
        // console.log(body);
        assert.equal(2, body.length);
        done(err, body);
      });
    });

    it('should invoke hooks', function(done) {
      var events = [];
      var connector = ds.connector;
      connector.observe('before execute', function(ctx, next) {
        assert(ctx.req);
        events.push('before execute');
        next();
      });
      connector.observe('after execute', function(ctx, next) {
        assert(ctx.res);
        events.push('after execute');
        next();
      });
      User.find(function(err, body) {
        assert.deepEqual(events, ['before execute', 'after execute']);
        // console.log(body);
        assert.equal(2, body.length);
        done(err, body);
      });
    });

  });
});
