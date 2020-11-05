// Copyright IBM Corp. 2013,2019. All Rights Reserved.
// Node module: loopback-connector-rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const traverse = require('traverse');
const debug = require('debug')('loopback:connector:rest');
const g = require('strong-globalize')();
module.exports = JsonTemplate;

/**
 * A simple template for JSON objects
 * @param {object} template The json object for the template.
 * The template variable syntax is {name=defaultValue:type}.
 * Variables can only be declared within a string. A variable is required if
 * the name has a prefix of ! or ^.
 * For example:
 * - '{x=100:number}'
 * - '{x:number}'
 * - '{x}'
 * - '{x=100}ABC{y}123'
 * - '{!x}'
 * - '{x=100}ABC{^y}123'
 *
 * @constructor
 */
function JsonTemplate(template) {
  this.template = template || {};
}

/**
 * Compile the json template to extract the variable definitions
 *
 * @returns {object} A JSON object that describes the variable definitions
 */
JsonTemplate.prototype.compile = function() {
  if (this.schema) {
    return this.schema;
  }
  const schema = {};
  traverse(this.template).reduce(function(schema, item) {
    const key = this.key;
    const root = this.path[0];
    let match = null;

    function parse(item) {
      let matched = false;
      const templates = /\{(([\!\^]?[a-zA-Z\$_][\w\$]*)\s*(=([^:]+))?(:(\w+))?)\}/g;
      /* eslint-disable no-cond-assign */
      while (match = templates.exec(item)) {
        /* eslint-enable no-cond-assign */
        matched = true;
        const param = /([[\!\^]?[a-zA-Z\$_][\w\$]*)\s*(=([^:]+))?(:(\w+))?/.exec(match[1]);
        if (!param || !param[1]) {
          throw new Error(g.f('Invalid parameter: %s', match[1]));
        }
        let name = param[1];
        let required = false;
        // Check if the variable is required, i.e., the name starts with ! or ^
        if (name.charAt(0) === '!' || name.charAt(0) === '^') {
          name = name.substring(1);
          required = true;
        }
        const type = param[5]; // Type is param[5]
        schema[name] = {type: type, required: required, root: root};
        if (param[3] !== undefined) {
          schema[name]['default'] = param[3];
        }
      }
    }

    if (!this.isLeaf) {
      parse(key);
      return schema;
    }
    if (typeof item === 'string') {
      parse(item);
    }
    parse(key);
    return schema;
  }, schema);

  // Override the variable definition
  const vars = this.template.variables;
  let v;
  if (vars) {
    for (v in vars) {
      if (schema.hasOwnProperty(v)) {
        // Add or override properties of the variable definition
        /* eslint-disable one-var */
        for (const a in vars[v]) {
          schema[v][a] = vars[v][a];
        }
        /* eslint-enable one-var */
      }
    }
  }
  for (v in schema) {
    schema[v].type = schema[v].type || 'string'; // Default type to string
  }
  this.schema = schema;
  debug('Schema: %j', schema);
  return schema;
};

/**
 * Build the request by expanding the templatized properties with the named
 * values from options
 * @param parameters An object that contains all the parameter values keyed
 * by name
 * @returns {Object} A JSON object built from the template with the given
 * variable values
 */
JsonTemplate.prototype.build = function(parameters) {
  const self = this;
  this.compile();

  function transform(obj) {
    return traverse(obj).map(function(item) {
      const ctx = this;
      const templates = /\{(([\!\^]?[a-zA-Z\$_][\w\$]*)\s*(=([^:\{\}]+))?(:(\w+))?)\}/g;
      function build(item) {
        let match = null;
        const parsed = [];
        let index = 0;
        let matched = false;
        /* eslint-disable no-cond-assign */
        while (match = templates.exec(item)) {
          /* eslint-enable no-cond-assign */
          matched = true;
          if (index < match.index) {
            parsed.push(item.substring(index, match.index));
          }
          // The variable pattern is {name=defaultValue:type}
          const param = /([\!\^]?[a-zA-Z\$_][\w\$]*)\s*(=([^:\{\}]+))?(:(\w+))?/.exec(match[1]);
          if (!param || !param[1]) {
            throw new Error(g.f('Invalid parameter: %s', match[1]));
          }
          let name = param[1];
          let required = false;
          // Check if the variable is required, i.e.,
          // the name starts with ! or ^
          if (name.charAt(0) === '!' || name.charAt(0) === '^') {
            name = name.substring(1);
            required = true;
          }
          let val = parameters[name]; // Name is param[1]
          // Update the index to the first of the match
          index = match.index;
          // Continue if the object variable is not defined in template
          if (self.schema[name] === undefined) continue;
          let type = self.schema[name].type;
          if (typeof type === 'function') {
            type = type.name;
          }
          type = type.toLowerCase();

          if (val == null) {
            const defaultVal = self.schema[name].default;
            val = defaultVal;
            if ((type === 'json' || type === 'object') &&
              typeof defaultVal === 'string') {
              try {
                val = JSON.parse(defaultVal);
              } catch (err) {
                // Ignore
              }
            }
          }

          if (val !== undefined && val !== null) {
            if (type === 'number') {
              val = Number(val);
            } else if (type === 'boolean') {
              if (typeof val === 'string') {
                val = (val.toLowerCase() !== 'false' && val);
              } else {
                val = !!val;
              }
            }
            parsed.push(val);
          } else {
            if (required) {
              throw new Error(g.f('Required variable %s has no value', name));
            } else {
              // Has to be null instead of undefined as traverse will ignore
              // undefined
              parsed.push(null);
            }
          }
          index = match.index + match[0].length;
        }
        if (index < item.length) {
          // The rest
          parsed.push(item.substring(index));
        }
        let newValue = item;
        if (parsed.length === 1) {
          newValue = parsed[0];
        } else {
          if (matched) {
            newValue = parsed.join('');
          }
        }
        if (newValue !== item) {
          ctx.update(newValue, true);
          return undefined;
        }
        return newValue;
      }

      if (templates.test(this.key)) {
        const newKey = transform(this.key);
        const newVal = transform(item);
        this.parent.node[newKey] = newVal;
        this.remove();
        return undefined;
      }

      if (typeof item === 'string') {
        return build(item);
      } else {
        return item;
      }
    });
  }
  const result = transform(this.template);
  debug('Transformed request: %j', result);
  return result;
};
