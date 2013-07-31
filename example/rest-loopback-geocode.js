var loopback = require("loopback");

var ds = loopback.createDataSource({
    connector: require("../index"),
    debug: false,
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
                    "address": "{street},{city},{zipcode}",
                    "sensor": "{sensor=false}"
                },
                "responsePath": "$.results[0].geometry.location"
            },
            functions: {
                "geocode": ["street", "city", "zipcode"]
            }
        }
    ]});

var model = ds.createModel('dummy');

var loc = {
    street: '107 S B St',
    city: 'San Mateo',
    zipcode: '94401'
};


model.geocode(loc.street, loc.city, loc.zipcode, function (err, result) {
    if(result && result[0]) {
        console.log(result[0]);
    }
});
