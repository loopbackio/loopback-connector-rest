var assert = require('assert');

var DataSource = require('jugglingdb').DataSource;

describe('REST connector', function () {
    describe('JugglingDB adapter', function () {


        it('should mix in custom methods', function (done) {
            var spec = {
                debug: true,
                operations: [
                {
                    name: 'geocode',
                    parameters: ['latitude', 'longitude'],
                    request: {
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
            assert(ds.geocode);
            ds.geocode(40.714224, -73.961452, function (err, response) {
                // console.log(response.headers);
                var body = response.body;
                var address = body.results[0].formatted_address;
                console.log(address);
                assert.equal('285 Bedford Avenue, Brooklyn, NY 11211, USA', address);
                done(err, address);
            });

        });

        it('should mix in custom methods without parameters', function (done) {
            var spec = {
                debug: true,
                operations: [
                {
                    name: 'geocode',
                    request: {
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
            assert(ds.geocode);
            ds.geocode({latitude: 40.714224, longitude: -73.961452}, function (err, response) {
                // console.log(response.headers);
                var body = response.body;
                var address = body.results[0].formatted_address;
                console.log(address);
                assert.equal('285 Bedford Avenue, Brooklyn, NY 11211, USA', address);
                done(err, address);
            });

        });


    });
});