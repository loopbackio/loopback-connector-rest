var builder = require('../lib/rest-builder');
var jsonPath = require('JSONPath');

var req = builder.get('http://maps.googleapis.com/maps/api/geocode/{format:json}')
    .query({latlng: '{latitude},{longitude}', sensor: '{sensor}'})
    .body({x: 1, y: 'y', z: [1, 2, '{z:3}']});


var processResponse = function (error, response, body) {
    if (!error) {
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        if (body.status === 'OK') {
            console.log(jsonPath.eval(body, '$..formatted_address'));
            console.log(body.results[0].formatted_address);
        } else {
            console.log('Error: ', body.status);
        }

    } else {
        console.log('Error: ' + response.statusCode)
        console.log('Body: ', body)
    }
};

req.request({latitude: 40.714224, longitude: -73.961452, sensor: true}, processResponse);