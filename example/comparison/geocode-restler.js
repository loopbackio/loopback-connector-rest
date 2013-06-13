var restler = require('restler');

var processResponse = function (prefix, body, response) {
    // console.log(body);
    if (typeof body === 'string') {
        body = JSON.parse(body);
    }

    if (body.status === 'OK') {
        console.log(prefix, 'Address: ', body.results[0].formatted_address);
    } else {
        console.log(prefix, 'Error: ', body.status);
    }
};


var req1 = restler.get('http://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&sensor=true');
req1.on('complete', processResponse.bind(null, '1'));


var req2 = restler.request('http://maps.googleapis.com/maps/api/geocode/json',
    {
        method: 'GET',
        query: {
            latlng: '40.714224,-73.961452',
            sensor: true
        }
    }
);

req2.on('complete', processResponse.bind(null, '2'));

var GeoService = restler.service(function (sensor) {
    // this.defaults.query = {sensor: sensor ? true : false};
}, {
    baseURL: 'http://maps.googleapis.com/maps/api/geocode/'
}, {
    getAddress: function (latlng, cb) {
        return this.get('json', {query: {sensor: true, latlng: latlng}}).on('complete', cb);
    }
});


var geoService = new GeoService(false);
// geoService.getAddress('40.714224,-73.961452');
geoService.getAddress('40.714224,-73.961452', processResponse.bind(null, '3'));
