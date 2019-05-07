// Copyright IBM Corp. 2013,2019. All Rights Reserved.
// Node module: loopback-connector-rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var assert = require('assert');
var should = require('should');

var DataSource = require('loopback-datasource-juggler').DataSource;

var TEST_ADDRESS = /Bedford Ave.*, Brooklyn, NY 11211, USA/;

const geocoderRoutes = require('./fixtures/geocoder-stub');

describe('REST connector', function() {
  describe('custom operations', function() {
    var app = null;
    var server = null;
    var hostURL;

    beforeEach(function createAppAndListeningServer(done) {
      app = require('./express-helper')();
      server = app.listen(app.get('port'), function(err) {
        if (err) return done(err);
        hostURL = 'http://localhost:' + server.address().port;
        done(err);
      });
    });

    afterEach(function closeServerAndApp(done) {
      if (server) {
        server.close(done);
        server = null;
      }
      app = null;
    });

    it('should configure remote methods', function(done) {
      app.all('*', dumpRequest);

      var spec = getRequestTemplate();
      var template = {
        operations: [
          {
            template: spec,
            functions: {
              m1: ['p', 'x', 'a', {name: 'b', source: 'header'}, 'z'],
            },
          },
        ],
      };
      var ds = new DataSource(require('../lib/rest-connector'), template);
      var model = ds.createModel('rest');
      assert(model.m1);
      assert.deepEqual(model.m1.accepts, [
        {
          arg: 'p',
          http: {source: 'path'},
          required: false,
          type: 'string',
        },
        {
          arg: 'x',
          type: 'number',
          required: false,
          http: {source: 'query'},
        },
        {
          arg: 'a',
          type: 'number',
          required: false,
          http: {source: 'body'},
        },
        {
          arg: 'b',
          type: 'boolean',
          required: false,
          http: {source: 'header'},
        },
        {
          arg: 'z',
          type: 'string',
          required: false,
          http: {source: 'header'},
        },
      ]);
      assert(model.m1.shared);
      assert.deepEqual(model.m1.http, {verb: 'post', path: '/m1/:p'});
      model.m1('1', 3, 5, false, 'zzz', function(err, result) {
        if (err) return done(err);
        result.headers.should.have.property('x-test', 'zzz');
        delete result.headers;
        assert.deepEqual(result, {
          method: 'POST',
          url: '/1?x=3&y=2',
          query: {x: '3', y: '2'},
          body: {a: 5, b: false},
        });
        done(err, result);
      });
    });

    it('should mix in custom methods', function(done) {
      app.use(geocoderRoutes);

      var spec = {
        debug: false,
        operations: [
          {
            template: {
              method: 'GET',
              url: hostURL + '/maps/api/geocode/{format=json}',
              headers: {
                accept: 'application/json',
                'content-type': 'application/json',
              },
              query: {
                latlng: '{latitude},{longitude}',
                sensor: '{sensor=true}',
              },
            },
            // Bind the template to one or more JavaScript functions
            // The key is the function name and the value is an array of variable names
            functions: {
              geocode: ['latitude', 'longitude'],
            },
          },
        ],
      };
      var ds = new DataSource(require('../lib/rest-connector'), spec);
      assert(ds.invoke);
      assert(ds.geocode);
      ds.geocode(40.714224, -73.961452, function(err, body, response) {
        if (!checkGoogleMapAPIResult(err, response, done)) return;
        var address = body.results[0].formatted_address;
        assert.ok(address.match(TEST_ADDRESS));
        done(err, address);
      });
    });

    it('should mix in custom methods for all functions', function(done) {
      app.use(geocoderRoutes);

      var spec = {
        debug: false,
        operations: [
          {
            template: {
              method: 'GET',
              url: hostURL + '/maps/api/geocode/{format=json}',
              headers: {
                accept: 'application/json',
                'content-type': 'application/json',
              },
              query: {
                latlng: '{location}',
                address: '{address}',
                sensor: '{sensor=true}',
              },
            },
            functions: {
              getAddress: ['location'],
              getGeoLocation: ['address'],
            },
          },
        ],
      };
      var ds = new DataSource(require('../lib/rest-connector'), spec);
      assert(ds.getAddress);
      ds.getAddress('40.714224,-73.961452', function(err, body, response) {
        if (!checkGoogleMapAPIResult(err, response, done)) return;
        var address = body.results[0].formatted_address;
        assert.ok(address.match(TEST_ADDRESS));
        assert(ds.getGeoLocation);
        ds.getGeoLocation('107 S B St, San Mateo, CA', function(
          err,
          body,
          response
        ) {
          if (!checkGoogleMapAPIResult(err, response, done)) return;
          var loc = body.results[0].geometry.location;
          done(err, loc);
        });
      });
    });

    it('should mix in predefined default values for all functions', function(done) {
      app.use(geocoderRoutes);

      const TEST_ADDRESS = '107 S B St, San Mateo, CA 94401, USA';
      const TEST_TIMEZONE = /.*Australia.*/;
      var spec = {
        debug: false,
        operations: [
          {
            template: {
              'method': 'GET',
              'url': hostURL + '/maps/api/{path}/{format=json}',
              'headers': {
                'accept': 'application/json',
                'content-type': 'application/json',
              },
              'query': {
                'address': '{address}',
                'location': '{location}',
                'timestamp': '1514768461',
              },
            },
            functions: {
              'getAddress': ['address', 'path=geocode'],
              'getTimezone': ['location', 'path=timezone'],
            },
          },
        ]};
      var ds = new DataSource(require('../lib/rest-connector'), spec);
      assert(ds.getAddress);
      ds.getAddress('107 S B St, San Mateo, CA', function(err, body, response) {
        if (!checkGoogleMapAPIResult(err, response, done)) return;
        var address = body.results[0].formatted_address;
        assert.ok(address.match(TEST_ADDRESS));
        assert(ds.getTimezone);
        ds.getTimezone('-33.86,151.20', function(err, body, response) {
          if (!checkGoogleMapAPIResult(err, response, done)) return;
          var timeZoneId = body.timeZoneId;
          assert.equal(timeZoneId.match(TEST_TIMEZONE).length, 1, 'Incorrect Time Zone ID');
          var timeZone = body.timeZoneName;
          assert.equal(timeZone.match(TEST_TIMEZONE).length, 1, 'Incorrect Time Zone Name');
          done(err, body);
        });
      });
    });

    it('should mix in invoke method', function(done) {
      app.use(geocoderRoutes);

      var spec = {
        debug: false,
        operations: [
          {
            template: {
              method: 'GET',
              url: hostURL + '/maps/api/geocode/{format=json}',
              headers: {
                accept: 'application/json',
                'content-type': 'application/json',
              },
              query: {
                latlng: '{latitude},{longitude}',
                sensor: '{sensor=true}',
              },
            },
          },
        ],
      };
      var ds = new DataSource(require('../lib/rest-connector'), spec);
      assert(ds.invoke);
      ds.invoke({latitude: 40.714224, longitude: -73.961452}, function(
        err,
        body,
        response
      ) {
        if (!checkGoogleMapAPIResult(err, response, done)) return;
        var address = body.results[0].formatted_address;
        assert.ok(address.match(TEST_ADDRESS));
        done(err, address);
      });
    });

    it('should map clientKey and clientCert to key and cert for backwards compat', function() {
      var spec = getRequestTemplate();
      var template = {
        clientKey: 'CLIENT.KEY',
        clientCert: 'CLIENT.CERT',
        operations: [
          {
            template: spec,
            functions: {
              m1: ['x'],
            },
          },
        ],
      };
      var ds = new DataSource(require('../lib/rest-connector'), template);
      assert.equal(ds.connector._settings.key, template.clientKey);
      assert.equal(ds.connector._settings.cert, template.clientCert);
    });

    it('should keep order of precedence: options, top level, and defaults', function(done) {
      app.all('*', dumpRequest);

      var spec = getRequestTemplate();
      var template = {
        options: {
          headers: {
            'x-options': 'options',
          },
        },
        headers: {
          'x-top': 'top',
          'x-options': 'top',
        },
        defaults: {
          headers: {
            'x-defaults': 'defaults',
            'x-options': 'defaults',
            'x-top': 'defaults',
          },
        },
        operations: [
          {
            template: spec,
            functions: {
              m1: ['x'],
            },
          },
        ],
      };
      var ds = new DataSource(require('../lib/rest-connector'), template);
      var model = ds.createModel('rest');
      model.m1(3, function(err, result) {
        if (err) return done(err);
        assert.equal(result.headers['x-defaults'], 'defaults');
        assert.equal(result.headers['x-options'], 'options');
        assert.equal(result.headers['x-top'], 'top');
        done(err, result);
      });
    });

    function getRequestTemplate() {
      const spec = require('./request-template.json');
      spec.url = hostURL + '/{p}'; // replace template.url to use current host
      return spec;
    }
  });
});

function checkGoogleMapAPIResult(err, res, done) {
  if (err) {
    done(err);
    return false;
  }
  if (res.statusCode !== 200) {
    done(new Error('Google Map API call fails: ' + res.statusCode));
    return false;
  }
  assert.equal(res.body.status, 'OK', res.body.error_message);
  return true;
}

function dumpRequest(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  var payload = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
  };
  res.status(200).json(payload);
}

function requestChecker(fn) {
  return function assertRequest(req, res, next) {
    // escape Express' error handler and let assertions fail the test
    process.nextTick(() => {
      try {
        fn(req);
        next();
      } catch (err) {
        res.end();
        throw err;
      }
    });
  };
}
