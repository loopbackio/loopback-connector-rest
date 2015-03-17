var assert = require('assert');

var DataSource = require('loopback-datasource-juggler').DataSource;

const TEST_ADDRESS = /Bedford Avenue, Brooklyn, NY 11211, USA/;

describe('REST connector', function () {
  describe('custom operations', function () {

    var server = null;
    before(function (done) {
      var app = require('./express-helper')();

      app.all('*', function (req, res, next) {
        res.setHeader('Content-Type', 'application/json');
        var payload = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          query: req.query,
          body: req.body
        };
        res.status(200).json(payload);
      });

      server = app.listen(app.get('port'), function (err, data) {
        // console.log('Server listening on ', app.get('port'));
        done(err, data);
      });
    });

    after(function (done) {
      server && server.close(done);
    });

    it('should configure remote methods', function (done) {
      var spec = require('./request-template.json');
      var template = {
        operations: [
          {template: spec, functions: {
            m1: ["x", "a", "b"]
          }}
        ]
      };
      var ds = new DataSource(require('../lib/rest-connector'), template);
      var model = ds.createModel('rest');
      assert(model.m1);
      assert(model.m1.shared);
      assert.deepEqual(model.m1.http, {verb: 'post'});
      model.m1(3, 5, false, function (err, result) {
        delete result.headers;
        assert.deepEqual(result, { method: 'POST',
          url: '/?x=3&y=2',
          query: { x: '3', y: '2' },
          body: { a: 5, b: false } });
        done(err, result);
      });
    });

    it('should mix in custom methods', function (done) {
      var spec = {
        debug: false,
        operations: [
          {
            template: {
              "method": "GET",
              "url": "http://maps.googleapis.com/maps/api/geocode/{format=json}",
              "headers": {
                "accept": "application/json",
                "content-type": "application/json"
              },
              "query": {
                "latlng": "{latitude},{longitude}",
                "sensor": "{sensor=true}"
              }
            },
            // Bind the template to one or more JavaScript functions
            // The key is the function name and the value is an array of variable names
            functions: {
              'geocode': ['latitude', 'longitude']
            }
          }
        ]};
      var ds = new DataSource(require('../lib/rest-connector'), spec);
      assert(ds.invoke);
      assert(ds.geocode);
      ds.geocode(40.714224, -73.961452, function (err, result, response) {
        // console.log(response.headers);
        var body = response.body;
        var address = body.results[0].formatted_address;
        // console.log(address);

        assert.ok(address.match(TEST_ADDRESS));
        done(err, address);
      });

    });

    it('should mix in custom methods for all functions', function (done) {
      var spec = {
        debug: false,
        operations: [
          {
            template: {
              "method": "GET",
              "url": "http://maps.googleapis.com/maps/api/geocode/{format=json}",
              "headers": {
                "accept": "application/json",
                "content-type": "application/json"
              },
              "query": {
                "latlng": "{location}",
                "address": "{address}",
                "sensor": "{sensor=true}"
              }
            },
            functions: {
              'getAddress': ['location'],
              'getGeoLocation': ['address']
            }
          }
        ]};
      var ds = new DataSource(require('../lib/rest-connector'), spec);
      assert(ds.getAddress);
      ds.getAddress('40.714224,-73.961452', function (err, result, response) {
        var body = response.body;
        var address = body.results[0].formatted_address;
        // console.log('Address', address);
        assert.ok(address.match(TEST_ADDRESS));
        assert(ds.getGeoLocation);
        ds.getGeoLocation('107 S B St, San Mateo, CA', function (err, result, response) {
          // console.log(response.headers);
          var body = response.body;
          var loc = body.results[0].geometry.location;
          // console.log('Location', loc);
          done(err, loc);
        });
      });

    });

    it('should mix in invoke method', function (done) {
      var spec = {
        debug: false,
        operations: [
          {
            template: {
              "method": "GET",
              "url": "http://maps.googleapis.com/maps/api/geocode/{format=json}",
              "headers": {
                "accept": "application/json",
                "content-type": "application/json"
              },
              "query": {
                "latlng": "{latitude},{longitude}",
                "sensor": "{sensor=true}"
              }
            }
          }
        ]};
      var ds = new DataSource(require('../lib/rest-connector'), spec);
      assert(ds.invoke);
      ds.invoke({latitude: 40.714224, longitude: -73.961452}, function (err, result, response) {
        // console.log(response.headers);
        var body = response.body;
        var address = body.results[0].formatted_address;
        // console.log(address);
        assert.ok(address.match(TEST_ADDRESS));
        done(err, address);
      });

    });

    it('should map clientKey and clientCert to key and cert for backwards compat', function () {
      var spec = require('./request-template.json');
      var template = {
        clientKey : 'CLIENT.KEY',
        clientCert: 'CLIENT.CERT',
        operations: [
          {template: spec, functions: {
              m1: ["x"]
          }}
        ]
      };
      var ds = new DataSource(require('../lib/rest-connector'), template);
      assert.equal(ds.connector._settings.key, template.clientKey);
      assert.equal(ds.connector._settings.cert, template.clientCert);
    });

    it('should keep order of prececence: options, top level, and defaults', function (done) {
      var spec = require('./request-template.json');
      var template = {
        options : {
          'headers': {
            'x-options'   : 'options'
          }
        },
        'headers': {
          'x-top'         : 'top',
          'x-options'     : 'top'
        },
        defaults: {
          'headers': {
            'x-defaults'  : 'defaults',
            'x-options'   : 'defaults',
            'x-top'       : 'defaults'
          }
        },
        operations: [
          {template: spec, functions: {
              m1: ["x"]
          }}
        ]
      };
      var ds = new DataSource(require('../lib/rest-connector'), template);
      var model = ds.createModel('rest');
      model.m1(3, function (err, result) {
        assert.equal(result.headers['x-defaults'], 'defaults');
        assert.equal(result.headers['x-options'], 'options');
        assert.equal(result.headers['x-top'], 'top');
        done(err, result);
      });
    });

  });
});
