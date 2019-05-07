// Copyright IBM Corp. 2014,2018. All Rights Reserved.
// Node module: loopback-connector-rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const express = require('express');
const multer = require('multer');
const upload = multer();

module.exports = function createApp() {
  const app = express();

  // dynamically allocate available PORT if no port provided
  app.set('port', process.env.PORT || 0);
  app.use(require('body-parser').json());

  app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
      res.sendStatus(200);
    } else {
      res.sendStatus(500);
    }
  });

  return app;
};
