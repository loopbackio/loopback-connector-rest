var ejs = require('ejs');
var builder = require('../lib/rest-builder');

var req = builder.get('http://maps.googleapis.com/maps/api/geocode/{{=format}}')
    .query({latlng: '{{=latitude}},{{=longitude}}', sensor: '{{=sensor}}'});

req.data({x: 1, y: 'y'});

var options = {open: '{{', close: '}}', latitude: 40.714224, longitude: -73.961452, sensor: true, format: 'json'};

var json = req.build(options);

var request = require('request');

var processResponse = function (error, response, body) {
    if (!error) {
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        if (body.status === 'OK') {
            console.log(body.results[0].formatted_address);
        } else {
            console.log('Error: ', body.status);
        }

    } else {
        console.log('Error: ' + response.statusCode)
        console.log('Body: ', body)
    }
};

request(
    {
        method: json.method,
        uri: json.url,
        qs: json.queryParameters,
        headers: json.headers
    },
    processResponse
)

