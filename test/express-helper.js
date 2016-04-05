// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-connector-rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

var express = require('express');

module.exports = function createApp() {
  var app = express();

  app.set('port', process.env.PORT || 3000);
  app.use(require('body-parser').json());

  return app;
}