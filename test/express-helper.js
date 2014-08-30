var express = require('express');

module.exports = function createApp() {
  var app = express();

  app.set('port', process.env.PORT || 3000);
  app.use(require('body-parser').json());

  return app;
}