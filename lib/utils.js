// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

var Promise = require('bluebird');

exports.createPromiseCallback = createPromiseCallback;

function createPromiseCallback() {
  var cb;
  var promise = new Promise(function(resolve, reject) {
    cb = function(err, data) {
      if (err) return reject(err);
      return resolve(data);
    };
  });
  cb.promise = promise;
  return cb;
}

function throwPromiseNotDefined() {
  var errMsg = g.f('Your Node runtime does support {{ES6 Promises}}. ' +
    'Set {{"global.Promise"}} to your preferred implementation of {{promises}}.');
  throw new Error(errMsg);
}
