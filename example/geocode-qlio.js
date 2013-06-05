var Engine = require('ql.io-engine');

var engine = new Engine({
});
var script = 'create table google.geocode on '
+ ' select get from "http://maps.googleapis.com/maps/api/geocode/{format}?sensor=true&latlng={^latlng}"'
+ ' using defaults format = \'json\''
+ ' resultset \'results\'';

script+= '\nselect formatted_address from google.geocode where latlng=\'40.714224,-73.961452\'';

var inFlight, success, error, request, response;
engine.execute(script, function(req) {
    /*
    req.on(Engine.Events.STATEMENT_IN_FLIGHT, function() {
        console.log ("Statement In_flight event");
        inFlight = true;
    });
    req.on(Engine.Events.STATEMENT_SUCCESS, function() {
        console.log ("Statement Success event");
        success = true;
    });
    req.on(Engine.Events.STATEMENT_REQUEST, function() {
        console.log ("Statement Request event");
        request = true;
    });
    req.on(Engine.Events.STATEMENT_RESPONSE, function() {
        console.log ("Statement Response event");
        response = true;
    });
    req.on(Engine.Events.STATEMENT_ERROR, function() {
        console.log ("Statement Error event");
        error = true;
    });
    */
    req.on('end', function(err, results) {
        console.log(results);
    })
})




