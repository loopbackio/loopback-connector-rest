// Copyright IBM Corp. 2013,2019. All Rights Reserved.
// Node module: loopback-connector-rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const traverse = require('traverse');

exports.discoverModelDefinitions = discoverModelDefinitions;

/**
 * Discover model definitions from a JSON object
 * @param json
 * @param options
 * @returns {Array}
 */
function discoverModelDefinitions(json, options) {
  const schemas = [];
  const stack = [];
  const result = traverse(json, {includeSymbols: false}).forEach(function(item) {
    let type = typeof item;

    if (Array.isArray(item)) {
      type = 'array';
    }
    if (type === 'object') {
      type = item.constructor.name.toLowerCase();
    }

    const name = this.key ? this.key : 'root';
    if (type === 'object' || type === 'array') {
      const s = {name: name, properties: {}};
      stack[this.level] = s;
      schemas.push(s);
      if (type === 'object') {
        type = name;
      }
    }

    if (this.level > 0) {
      stack[this.level - 1].properties[this.key] = type;
    }

    return item;
  });

  console.log(schemas);
  return schemas;
}

/*
 var json = {
 name: 'Joe',
 age: 30,
 birthday: new Date(),
 vip: true,
 address: {
 street: '1 Main St',
 city: 'San Jose',
 state: 'CA',
 zipcode: '95131',
 country: 'US'
 },
 friends: ['John', 'Mary'],
 email: 'x@sample.com'
 }

 */
