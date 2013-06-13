var agent = require('superagent');

var processResponse = function (prefix, err, response) {
    var body = response.body;
    if (typeof body === 'string') {
        body = JSON.parse(body);
    }

    if (body.status === 'OK') {
        console.log(prefix, 'Address: ', body.results[0].formatted_address);
    } else {
        console.log(prefix, 'Error: ', body.status);
    }
};


agent.get('http://maps.googleapis.com/maps/api/geocode/json')
    .query({latlng: '40.714224,-73.961452', sensor: true})
    .end(processResponse.bind(null, '1'));

agent.get('http://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&sensor=true', processResponse.bind(null, '2'));

