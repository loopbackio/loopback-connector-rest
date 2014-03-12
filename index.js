module.exports = require('./lib/rest-builder');

var connector = require('./lib/rest-connector');
module.exports.RestConnector = connector.RestConnector;
module.exports.initialize = connector.initialize;