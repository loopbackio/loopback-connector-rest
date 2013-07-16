var Engine = require('ql.io-engine');
var path = require('path');

console.log(__dirname);

var engine = new Engine({
    connectors : path.join(__dirname, './qlio-connector')
});
var script = 'create table loopback.inventory via loopback on '
+ ' select do find at "inventory where product={^product}"'
+ ' using defaults format = \'json\''
+ ' resultset \'results\'';

script+= '\nselect formatted_address from loopback.inventory where product=\'p001\'';

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
        console.log('Results: ', err, results);
    })
})




