// Copyright IBM Corp. 2013,2016. All Rights Reserved.
// Node module: loopback-connector-rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

module.exports = require('./lib/rest-builder');

var connector = require('./lib/rest-connector');
module.exports.RestConnector = connector.RestConnector;
module.exports.initialize = connector.initialize;