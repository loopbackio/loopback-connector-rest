var Engine = require('ql.io-engine');

// Create an instance of ql.io engine
var engine = new Engine({});

// Define the script with two statements
// First create a virtual table
var script = "create table google.geocode on "
    + " select get from \"http://maps.googleapis.com/maps/api/geocode/{format}?sensor=true&latlng={^latlng}\""
    + " using defaults format = 'json'"
    + " resultset 'results'\n";

// Define a select statement
script += "select formatted_address from google.geocode where latlng='40.714224,-73.961452'";

// Run the query
engine.execute(script, function (req) {
    req.on('end', function (err, results) {
        console.log(results);
    })
})




