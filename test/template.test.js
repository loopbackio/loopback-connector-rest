var assert = require('assert');
var should = require('should');

var JsonTemplate = require('../lib/template');

describe('JsonTemplate', function () {
  describe('Request templating', function () {

    it('should substitute the variables', function (done) {
      var template = new JsonTemplate({
        url: 'http://localhost:3000/{p}',
        query: {x: '{x}', y: 2}
      });
      var result = template.build({p: 1, x: 'X'});
      assert.equal('http://localhost:3000/1', result.url)
      assert.equal('X', result.query.x);
      assert.equal(2, result.query.y);
      done(null, result);
    });

    it('should substitute the variables independently', function (done) {
      var template = new JsonTemplate({
        url: 'http://localhost:3000/{p}',
        query: {x: '{x}', y: 2}
      });
      var result = template.build({p: 1, x: 'X'});
      assert.equal('http://localhost:3000/1', result.url)
      assert.equal('X', result.query.x);
      assert.equal(2, result.query.y);

      result = template.build({p: 2, x: 'X2'});
      assert.equal('http://localhost:3000/2', result.url)
      assert.equal('X2', result.query.x);
      assert.equal(2, result.query.y);

      done(null, result);
    });

    it('should support default variables', function (done) {
      var template = new JsonTemplate({
        url: 'http://localhost:3000/{p=100}',
        query: {x: '{x=ME}', y: 2}
      });
      var result = template.build({p: 1});
      assert.equal('http://localhost:3000/1', result.url)
      assert.equal('ME', result.query.x);
      assert.equal(2, result.query.y);
      done(null, result);

    });

    it('should support typed variables', function (done) {
      var template = new JsonTemplate({
        url: 'http://localhost:3000/{p=100}',
        query: {x: '{x=100:number}', y: 2},
        body: {a: '{a=1:number}', b: '{b=true:boolean}', c:'{c=[99]:json}'}
      });
      var result = template.build({p: 1, a: 100, b: false});

      // console.log(body);
      assert.equal('http://localhost:3000/1', result.url);
      assert.equal(100, result.query.x);
      assert.equal(2, result.query.y);
      assert.equal(100, result.body.a);
      assert.equal(false, result.body.b);
      assert(Array.isArray(result.body.c));
      assert.equal(99, result.body.c[0]);
      done(null, result);
    });

    it('should report missing required variables', function (done) {
      var template = new JsonTemplate({
        url: 'http://localhost:3000/{!p}',
        query: {x: '{x=100:number}', y: 2},
        body: {a: '{^a:number}', b: '{!b=true:boolean}'}
      });
      try {
        var result = template.build({a: 100, b: false});
        assert.fail();
      } catch (err) {
        // This is expected
        done(null, null);
      }
    });

    it('should support required variables', function (done) {
      var template = new JsonTemplate({
        url: 'http://localhost:3000/{!p}',
        query: {x: '{x=100:number}', y: 2},
        body: {a: '{^a:number}', b: '{!b=true:boolean}'}
      });
      var result = template.build({p: 1, a: 100, b: false});

      assert.equal('http://localhost:3000/1', result.url);
      assert.equal(100, result.query.x);
      assert.equal(2, result.query.y);
      assert.equal(100, result.body.a);
      assert.equal(false, result.body.b);
      done(null, result);
    });

    it('should support object variables', function (done) {
      var template = new JsonTemplate({
        url: 'http://localhost:3000/{!p}',
        query: {x: '{x=100:number}', y: 2},
        body: '{body}'
      });
      var result = template.build({p: 1, body: {a: 100, b: false}});

      assert.equal('http://localhost:3000/1', result.url);
      assert.equal(100, result.query.x);
      assert.equal(2, result.query.y);
      assert.equal(100, result.body.a);
      assert.equal(false, result.body.b);
      done(null, result);
    });

    it('should support object variables with expressions {var} when is not defined in template', function (done) {
      var template = new JsonTemplate({
        url: 'http://localhost:3000/update',
        body: '{body}'
      });

      var bodyContent = {id: 1, template: 'this is a normal content with ${var} variables'};

      var result = template.build({body: bodyContent});
      assert.equal(bodyContent, result.body);
      done(null, result);
    });

    it('should support array variables', function (done) {
      var template = new JsonTemplate({
        url: 'http://localhost:3000/{!p}',
        query: {x: '{x=100:number}', y: 2},
        body: [1, 2, '{z:number}']
      });
      var result = template.build({p: 1, z: 3});

      assert.equal('http://localhost:3000/1', result.url);
      assert.equal(100, result.query.x);
      assert.equal(2, result.query.y);
      assert.equal(1, result.body[0]);
      assert.equal(2, result.body[1]);
      assert.equal(3, result.body[2]);
      done(null, result);
    });

    it('should allow template with vars in keys', function(done) {
      var json = require('./request-template-with-key-var.json');

      var template = new JsonTemplate(json);
      var result = template.build({uniqueId: 1, email: 'x@y.com',
        clientId: 'c1', clientSecret: 's1'});
      result.should.be.eql({ method: 'POST',
        url: 'https://example.com/v1/authenticate',
        body: { auth_data: { '1': {
          emailAddress: 'x@y.com',
          id: 'third_party'
        } },
          grant_type: 'client_credentials',
          client_id: 'c1',
          client_secret: 's1' } });
      done();
    });

  });

});
