// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: loopback-connector-rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const assert = require('assert');
const express = require('express');
const should = require('should');

const router = express.Router();
module.exports = router;

router.use((req, res, next) => {
  should(req.headers).containEql({
    accept: 'application/json',
    'content-type': 'application/json',
  });
  next();
});

router.get('/maps/api/geocode/json', function geocode(req, res, next) {
  if (req.query.latlng === '40.714224,-73.961452') {
    // response for the following GET request:
    // https://maps.googleapis.com/maps/api/geocode/json?key={key}&latlng=40.714224,-73.961452
    res.json(require('./geocode-latlng-40.714224_-73.961452.json'));
  } else if (req.query.address === '107 S B St, San Mateo, CA') {
    // response for the following GET request:
    // https://maps.googleapis.com/maps/api/geocode/json?key={key}&address=107 S B St, San Mateo, CA
    res.json(require('./geocode-address-san_mateo_ca.json'));
  } else {
    throw new Error('Invalid geocode request: ', req.query);
  }
});

router.get('/maps/api/timezone/json', function timezone(req, res, next) {
  if (req.query.location === '-33.86,151.20') {
    // response for the following GET request:
    // https://maps.googleapis.com/maps/api/timezone/json?key={key}&location=-33.86,151.20
    res.json(require('./timezone-location--33.86_151.20.json'));
  } else {
    throw new Error('Invalid timezone request: ', req.query);
  }
});

router.use(function reportErrorsToMocha(err, req, res, next) {
  // escape Express error handler
  process.nextTick(() => {
    // always end the response
    process.nextTick(() => res.end());
    // throw the error so that Mocha can fail the test
    throw err;
  });
});
