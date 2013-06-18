var assert = require('assert');

var DataSource = require('jugglingdb').DataSource;

var spec = {operations: [
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


describe('REST connector', function () {
    describe('JugglingDB adapter', function () {


        it('should mix in custom methods', function (done) {
            var ds = new DataSource(require('../lib/rest-adapter'), spec);
            assert(ds.geocode);
            ds.geocode(40.714224,-73.961452, function(err, response) {
                console.log(response.headers);
                var body = response.body;
                console.log(body.results[0].formatted_address);
                done(err, body);
            });

        });


    });
});