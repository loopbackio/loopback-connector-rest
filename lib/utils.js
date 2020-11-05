// Copyright IBM Corp. 2015,2019. All Rights Reserved.
// Node module: loopback-connector-rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const SG = require('strong-globalize');
const g = SG();

exports.createPromiseCallback = createPromiseCallback;

function createPromiseCallback() {
  let cb;

  if (!global.Promise) {
    cb = function() {};
    cb.promise = {};
    Object.defineProperty(cb.promise, 'then', {get: throwPromiseNotDefined});
    Object.defineProperty(cb.promise, 'catch', {get: throwPromiseNotDefined});
    return cb;
  }

  const promise = new Promise(function(resolve, reject) {
    cb = function(err, data) {
      if (err) return reject(err);
      return resolve(data);
    };
  });
  cb.promise = promise;
  return cb;
}

function throwPromiseNotDefined() {
  const errMsg = g.f('Your Node runtime does support {{ES6 Promises}}. ' +
    'Set {{"global.Promise"}} to your preferred implementation of {{promises}}.');
  throw new Error(errMsg);
}
