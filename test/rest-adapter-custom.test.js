var assert = require('assert');

var DataSource = require('loopback-data').DataSource;

const TEST_ADDRESS = /Bedford Avenue, Brooklyn, NY 11211, USA/;

describe('REST connector', function () {
    describe('JugglingDB adapter', function () {


        it('should mix in custom methods', function (done) {
            var spec = {
                debug: true,
                operations: [
                {
                    template: {
                        "method": "GET",
                        "url": "http://maps.googleapis.com/maps/api/geocode/{format=json}",
                        "headers": {
                            "accepts": "application/json",
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
            var ds = new DataSource(require('../lib/rest-adapter'), spec);
            assert(ds.invoke);
            assert(ds.geocode);
            ds.geocode(40.714224, -73.961452, function (err, response) {
                // console.log(response.headers);
                var body = response.body;
                var address = body.results[0].formatted_address;
                console.log(address);

                assert.ok(address.match(TEST_ADDRESS));
                done(err, address);
            });

        });

        it('should mix in custom methods for all functions', function (done) {
            var spec = {
                debug: true,
                operations: [
                {
                    template: {
                        "method": "GET",
                        "url": "http://maps.googleapis.com/maps/api/geocode/{format=json}",
                        "headers": {
                            "accepts": "application/json",
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
            var ds = new DataSource(require('../lib/rest-adapter'), spec);
            assert(ds.getAddress);
            ds.getAddress('40.714224,-73.961452', function (err, response) {
                var body = response.body;
                var address = body.results[0].formatted_address;
                console.log('Address', address);
                assert.ok(address.match(TEST_ADDRESS));
                assert(ds.getGeoLocation);
                ds.getGeoLocation('107 S B St, San Mateo, CA', function (err, response) {
                    // console.log(response.headers);
                    var body = response.body;
                    var loc = body.results[0].geometry.location;
                    console.log('Location', loc);
                    done(err, loc);
                });
            });

        });

        it('should mix in invoke method', function (done) {
            var spec = {
                debug: true,
                operations: [
                    {
                        template: {
                            "method": "GET",
                            "url": "http://maps.googleapis.com/maps/api/geocode/{format=json}",
                            "headers": {
                                "accepts": "application/json",
                                "content-type": "application/json"
                            },
                            "query": {
                                "latlng": "{latitude},{longitude}",
                                "sensor": "{sensor=true}"
                            }
                        }
                    }
                ]};
            var ds = new DataSource(require('../lib/rest-adapter'), spec);
            assert(ds.invoke);
            ds.invoke({latitude: 40.714224, longitude: -73.961452}, function (err, response) {
                // console.log(response.headers);
                var body = response.body;
                var address = body.results[0].formatted_address;
                console.log(address);
                assert.ok(address.match(TEST_ADDRESS));
                done(err, address);
            });

        });

    });
});