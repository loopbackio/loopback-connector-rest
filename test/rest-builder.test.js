// Copyright IBM Corp. 2013,2016. All Rights Reserved.
// Node module: loopback-connector-rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var assert = require('assert');
const path = require('path');

if (!global.Promise) {
  global.Promise = require('bluebird');
}

var RequestBuilder = require('../lib/rest-builder');

describe('REST Request Builder', function() {
  describe('Request templating', function() {
    var hostURL = 'http://localhost:';
    var server = null;

    before(function(done) {
      var app = require('./express-helper')();

      app.all('*', function(req, res, next) {
        res.setHeader('Content-Type', 'application/json');
        var payload = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          query: req.query,
          body: req.body,
        };
        res.status(200).json(payload);
      });

      server = app.listen(app.get('port'), function(err, data) {
        hostURL += server.address().port;
        done(err, data);
      });
    });

    after(function(done) {
      if (server) server.close(done);
    });

    it('should substitute the variables', function(done) {
      var builder = new RequestBuilder('GET', hostURL + '/{p}').query({
        x: '{x}',
        y: 2,
      });
      builder.invoke({p: 1, x: 'X'}, function(err, body, response) {
        assert.equal(200, response.statusCode);
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
        assert.equal(body.query.x, 'X');
        assert.equal(body.query.y, 2);
        done(err, body);
      });
    });

    it('should support default variables', function(done) {
      var builder = new RequestBuilder('GET', hostURL + '/{p=100}').query({
        x: '{x=ME}',
        y: 2,
      });
      builder.invoke({p: 1}, function(err, body, response) {
        assert.equal(200, response.statusCode);
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
        assert.equal(0, body.url.indexOf('/1'));
        assert.equal('ME', body.query.x);
        assert.equal(2, body.query.y);
        done(err, body);
      });
    });

    it('should support typed variables', function(done) {
      var builder = new RequestBuilder('POST', hostURL + '/{p=100}')
        .query({x: '{x=100:number}', y: 2})
        .body({a: '{a=1:number}', b: '{b=true:boolean}'});
      builder.invoke({p: 1, a: 100, b: false}, function(err, body, response) {
        assert.equal(200, response.statusCode);
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
        assert.equal(0, body.url.indexOf('/1'));
        assert.equal(100, body.query.x);
        assert.equal(2, body.query.y);
        assert.equal(100, body.body.a);
        assert.equal(false, body.body.b);
        done(err, body);
      });
    });

    it('should report missing required variables', function(done) {
      var builder = new RequestBuilder('POST', hostURL + '/{!p}')
        .query({x: '{x=100:number}', y: 2})
        .body({a: '{^a:number}', b: '{!b=true:boolean}'});
      try {
        builder.invoke({a: 100, b: false}, function(err, body, response) {
          // console.log(response.headers);
          assert.equal(200, response.statusCode);
          if (typeof body === 'string') {
            body = JSON.parse(body);
          }
          // console.log(body);
          done(err, body);
        });
        assert.fail();
      } catch (err) {
        // This is expected
        done(null, null);
      }
    });

    it('should support required variables', function(done) {
      var builder = new RequestBuilder('POST', hostURL + '/{!p}')
        .query({x: '{x=100:number}', y: 2})
        .body({a: '{^a:number}', b: '{!b=true:boolean}'});

      builder.invoke({p: 1, a: 100, b: false}, function(err, body, response) {
        // console.log(response.headers);
        assert.equal(200, response.statusCode);
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
        // console.log(body);
        assert.equal(0, body.url.indexOf('/1'));
        assert.equal(100, body.query.x);
        assert.equal(2, body.query.y);
        assert.equal(100, body.body.a);
        assert.equal(false, body.body.b);
        done(err, body);
      });
    });

    it('should build an operation with the parameter names', function(done) {
      var builder = new RequestBuilder('POST', hostURL + '/{p}').query({
        x: '{x}',
        y: 2,
      });

      var fn = builder.operation(['p', 'x']);

      fn(1, 'X', function(err, body, response) {
        assert.equal(200, response.statusCode);
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
        // console.log(body);
        assert.equal(0, body.url.indexOf('/1'));
        assert.equal('X', body.query.x);
        assert.equal(2, body.query.y);
        // console.log(body);
        done(err, body);
      });
    });

    it('should build an operation with the parameter names as args', function(done) {
      var builder = new RequestBuilder('POST', hostURL + '/{p}').query({
        x: '{x}',
        y: 2,
      });

      var fn = builder.operation('p', 'x');

      fn(1, 'X', function(err, body, response) {
        assert.equal(200, response.statusCode);
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
        // console.log(body);
        assert.equal(0, body.url.indexOf('/1'));
        assert.equal('X', body.query.x);
        assert.equal(2, body.query.y);
        // console.log(body);
        done(err, body);
      });
    });

    it('should build from a json doc', function(done) {
      var template = require('./request-template.json');
      template.url = hostURL + '/{p}'; // update template.url to dynamic host
      var builder = new RequestBuilder(template);
      // console.log(builder.parse());
      builder.invoke({p: 1, a: 100, b: false}, function(err, body, response) {
        // console.log(response.headers);
        assert.equal(200, response.statusCode);
        if (typeof body === 'string') {
          body = JSON.parse(body);
        }
        // console.log(body);
        assert.equal(0, body.url.indexOf('/1'));
        assert.equal(100, body.query.x);
        assert.equal(2, body.query.y);
        assert.equal(100, body.body.a);
        assert.equal(false, body.body.b);
        done(err, body);
      });
    });

    it('should support custom request funciton', function(done) {
      var requestFunc = require('request').defaults({
        headers: {'X-MY-HEADER': 'my-header'},
      });
      var builder = new RequestBuilder(
        require('./request-template.json'),
        requestFunc
      );
      // console.log(builder.parse());
      builder.invoke({p: 1, a: 100, b: false}, function(err, body, response) {
        // console.log(response.headers);
        assert.equal(200, response.statusCode);
        assert.equal(body.headers['x-my-header'], 'my-header');
        done(err, body);
      });
    });

    it('should support attachments', done => {
      const filePath = path.join(__dirname, 'request-template.json');
      const builder = new RequestBuilder('POST', hostURL + '/upload').attach('file', filePath);
      builder.invoke({}, (err, body, response) => {
        assert.equal(200, response.statusCode);
        done(err, body);
      });
    });
  });

  describe('invoke', function() {
    it('should return a promise when no callback is specified', function() {
      var builder = new RequestBuilder(require('./request-template.json'));
      var promise = builder.invoke({p: 1, a: 100, b: false});
      assert(typeof promise['then'] === 'function');
      assert(typeof promise['catch'] === 'function');
      return promise.catch(function(err) {
        // Ignore the error
      });
    });
  });

  describe('handling of 4XX status codes', function() {
    var hostURL = 'http://localhost:';
    var server = null;

    before(function(done) {
      var app = require('./express-helper')();

      app.all('*', function(req, res, next) {
        res.setHeader('Content-Type', 'application/json');
        var payload = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          query: req.query,
          body: req.body,
        };
        res.status(400).json(payload);
      });

      server = app.listen(app.get('port'), function(err, data) {
        // console.log('Server listening on ', server.address().port);
        hostURL += server.address().port;
        done(err, data);
      });
    });

    after(function(done) {
      if (server) server.close(done);
    });

    it('should consider the response an error', function(done) {
      var builder = new RequestBuilder('GET', hostURL);
      builder.invoke(function(err, body, response) {
        assert.equal(400, response.statusCode);
        assert.equal(400, err.statusCode);
        assert(typeof err == 'object');
        assert(typeof err.message == 'string');
        done();
      });
    });

    it('should consider the promise failed', function(done) {
      var builder = new RequestBuilder('GET', hostURL);
      builder
        .invoke()
        .then(function() {
          assert.fail();
        })
        .catch(function(err) {
          assert.equal(400, err.statusCode);
          assert(typeof err == 'object');
          assert(typeof err.message == 'string');
          done();
        });
    });
  });
});
