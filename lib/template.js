var traverse = require('traverse');
var debug = require('debug')('loopback:connector:rest');
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
JsonTemplate.prototype.compile = function () {
  if (this.schema) {
    return this.schema;
  }
  var schema = {};
  traverse(this.template).reduce(function (schema, item) {
    var key = this.key;
    var match = null;

    function parse(item) {
      var matched = false;
      var templates = /\{([^\{\}]+)\}/g;
      while (match = templates.exec(item)) {
        matched = true;
        var param = /([^:=\s]+)\s*(=([^:]+))?(:(\w+))?/.exec(match[1]);
        if (!param || !param[1]) {
          throw new Error('Invalid parameter: ' + match[1]);
        }
        var name = param[1];
        var required = false;
        // Check if the variable is required, i.e., the name starts with ! or ^
        if (name.charAt(0) === '!' || name.charAt(0) === '^') {
          name = name.substring(1);
          required = true;
        }
        var type = param[5]; // Type is param[5]
        schema[name] = {type: type, required: required};
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
  var vars = this.template.variables;
  var v;
  if (vars) {
    for (v in vars) {
      if (schema.hasOwnProperty(v)) {
        // Add or override properties of the variable definition
        for (var a in vars[v]) {
          schema[v][a] = vars[v][a];
        }
      }
    }
  }
  for (v in schema) {
    schema[v].type = schema[v].type || 'string'; // Default type to string
  }
  this.schema = schema;
  debug('Schema: %j', schema);
  return schema;
}

/**
 * Build the request by expanding the templatized properties with the named
 * values from options
 * @param parameters An object that contains all the parameter values keyed
 * by name
 * @returns {Object} A JSON object built from the template with the given
 * variable values
 */
JsonTemplate.prototype.build = function (parameters) {
  var self = this;
  this.compile();

  function transform(obj) {
    return traverse(obj).map(function (item) {
      var templates = /\{([^\{\}]+)\}/g;
      function build(item) {
        var match = null;
        var parsed = [];
        var index = 0;
        var matched = false;
        while (match = templates.exec(item)) {
          matched = true;
          if (index < match.index) {
            parsed.push(item.substring(index, match.index));
          }
          // The variable pattern is {name=defaultValue:type}
          var param = /([^:=\s]+)\s*(=([^:]+))?(:(\w+))?/.exec(match[1]);
          if (!param || !param[1]) {
            throw new Error('Invalid parameter: ' + match[1]);
          }
          var name = param[1];
          var required = false;
          // Check if the variable is required, i.e.,
          // the name starts with ! or ^
          if (name.charAt(0) === '!' || name.charAt(0) === '^') {
            name = name.substring(1);
            required = true;
          }
          var val = parameters[name]; // Name is param[1]
          if(self.schema[name] === undefined) continue;
          var type = self.schema[name].type;
          if (typeof type === 'function') {
            type = type.name;
          }
          type = type.toLowerCase();

          val = (val === undefined || val === null) ?
            self.schema[name].default : val; // Default value is param[3]
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
              throw new Error('Required variable ' + name + ' has no value');
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
        var newValue = item;
        if (parsed.length === 1) {
          newValue = parsed[0];
        } else {
          if (matched) {
            newValue = parsed.join('');
          }
        }
        return newValue;
      }

      if(templates.test(this.key)) {
        var newKey = transform(this.key);
        var newVal = transform(item);
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
  var result = transform(this.template);
  debug('Transformed request: %j', result);
  return result;
}