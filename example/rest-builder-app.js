var restConnector = require('../lib/rest-builder');
var jsonPath = require('JSONPath');

// Define a callback to handle the response
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

// Build a REST API request using templates
var req = restConnector.get('http://maps.googleapis.com/maps/api/geocode/{format=json}')
    .query({latlng: '{latitude},{longitude}', sensor: '{sensor=true}'})
    // .body({x: 1, y: 'y', z: [1, 2, '{z:3}']});

// Now we can invoke the REST API using an object that provide values to the templatized variables
req.invoke({latitude: 40.714224, longitude: -73.961452, sensor: true}, processResponse);

// The 2nd flavor is to construct a function from the request by
// specifying an array of parameter names corresponding to the templatized variables
var fn = req.operation(['latitude', 'longitude']);

// Now we invoke the REST API as a method
fn(40.714224, -73.961452, processResponse);

// We can also directly use request apis
restConnector.request('http://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&sensor=true', processResponse);

restConnector.request( {
        method: 'GET',
        uri: 'http://maps.googleapis.com/maps/api/geocode/json',
        qs: {
            latlng: '40.714224,-73.961452',
            sensor: true
        }
    }, processResponse);

// Load the spec from json doc
var spec = require('./geocode.json');
req = restConnector.fromJSON(spec);

// Now we can invoke the REST API using an object that provide values to the templatized variables
req.invoke({latitude: 40.714224, longitude: -73.961452, sensor: true}, processResponse);