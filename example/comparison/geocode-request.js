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

request('http://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&sensor=true', processResponse);

request.get('http://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&sensor=true', processResponse);

request(
    {
        method: 'GET',
        uri: 'http://maps.googleapis.com/maps/api/geocode/json',
        qs: {
            latlng: '40.714224,-73.961452',
            sensor: true
        }
    },
    processResponse
)


