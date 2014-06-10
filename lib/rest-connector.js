var debug = require('debug')('loopback:connector:rest');
var RestResource = require('./rest-model');
var RequestBuilder = require('./rest-builder');

/**
 * Export the initialize method to loopback-datasource-juggler
 * @param {DataSource} dataSource The loopback data source instance
 * @param {function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
    var settings = dataSource.settings || {};
    var baseURL = settings.baseURL || settings.restPath || 'http://localhost:3000/';


    var connector = new RestConnector(baseURL);
    dataSource.connector = connector;
    dataSource.connector.dataSource = dataSource;

    var DataAccessObject = function() {};

    // Copy the methods from default DataAccessObject
    if (!settings.operations || settings.crud) {
      if (dataSource.constructor.DataAccessObject) {
        for (var i in dataSource.constructor.DataAccessObject) {
          DataAccessObject[i] = dataSource.constructor.DataAccessObject[i];
        }
        for (var i in dataSource.constructor.DataAccessObject.prototype) {
          DataAccessObject.prototype[i] = dataSource.constructor.DataAccessObject.prototype[i];
        }
      }
    }
    connector.DataAccessObject = DataAccessObject;

    if (Array.isArray(settings.operations)) {
        settings.operations.forEach(function (op) {
            if (!op.template) {
                throw new Error('The operation template is missing: ', op);
            }
            var builder = RequestBuilder.compile(op.template);

            // Bind all the functions to the template
            var functions = op.functions;
            if (functions) {
                for (var f in functions) {
                    if (debug.enabled) {
                        debug('Mixing in method: %s %j', f, functions[f]);
                    }
                    var fn = builder.operation(functions[f]);
                    dataSource[f] = fn;

                    fn.accepts = [];
                    fn.shared = true;
                    var args = builder.template.compile();
                    functions[f].forEach(function (p) {
                        fn.accepts.push({arg: p, type: args[p].type,
                          required: args[p].required, http: {source: 'query'}});
                    });
                    fn.returns = {arg: 'data', type: 'object', root: true};
                    fn.http = {verb: (op.template.method || 'GET').toLowerCase()}
                    // dataSource.defineOperation(f, fn, fn);
                    DataAccessObject[f] = fn;
                }
            }
            // Inject the invoke function
            var fn = function () {
                return builder.invoke.apply(builder, arguments);
            }
            var name = 'invoke';

            if (debug.enabled) {
                debug('Mixing in method: %s', name);
            }

            dataSource[name] = fn;
            fn.accepts = [
                {name: 'request', type: 'object'}
            ];
            fn.shared = true;
            // dataSource.defineOperation(name, fn, fn);
            DataAccessObject[name] = fn;
        });
    }


    callback && process.nextTick(callback);
};

exports.RestConnector = RestConnector;

/**
 * The RestConnector constructor
 * @param {string} baseURL The base URL
 * @constructor
 */
function RestConnector(baseURL) {
    this._baseURL = baseURL;
    this._models = {};
    this._resources = {};
}

/**
 * Hook for defining a model by the data source
 * @param {object} definition The model description
 */
RestConnector.prototype.define = function defineModel(definition) {
    var m = definition.model.modelName;
    this.installPostProcessor(definition);
    this._models[m] = definition;
    this._resources[m] = new RestResource(definition.model.pluralModelName, this._baseURL);
};

/**
 * Install the post processor
 * @param {object} definition The model description
 */
RestConnector.prototype.installPostProcessor = function installPostProcessor(definition) {
    var dates = [];
    Object.keys(definition.properties).forEach(function (column) {
        if (definition.properties[column].type.name === 'Date') {
            dates.push(column);
        }
    });

    var postProcessor = function (model) {
        var max = dates.length;
        for (var i = 0; i < max; i++) {
            var column = dates[i];
            if (model[column]) {
                model[column] = new Date(model[column]);
            }
        }
        return model;
    };

    definition.postProcessor = postProcessor;
};

/**
 * Pre-process the request data
 * @param {*} data The request data
 * @returns {{}}
 */
RestConnector.prototype.preProcess = function preProcess(data) {
    var result = {};
    Object.keys(data).forEach(function (key) {
        if (data[key] !== null) {
            result[key] = data[key];
        }
    });
    return result;
};

/**
 * Post-process the response data
 * @param {string} model The model name
 * @param {*} data The response data
 * @param {boolean} many Is it an array
 */
RestConnector.prototype.postProcess = function postProcess(model, data, many) {
    var result = data;
    var postProcessor = this._models[model].postProcessor;
    if (postProcessor && data) {
        if (!many) {
            result = postProcessor(data);
        } else if(Array.isArray(data)) {
            result = [];
            var size = data.length;
            for (var i = 0; i < size; i++) {
                if (data[i]) {
                    result[i] = postProcessor(data[i]);
                }
            }
        }
    }
    return result;
};

/**
 * Get a REST resource client for the given model
 * @param {string} model The model name
 * @returns {*}
 */
RestConnector.prototype.getResource = function getResourceUrl(model) {
    var resource = this._resources[model];
    if (!resource) {
        throw new Error('Resource for ' + model + ' is not defined');
    }
    return resource;
};


/**
 * Create an instance of the model with the given data
 * @param {string} model The model name
 * @param {object} data The model instance data
 * @param {function} [callback] The callback function
 */
RestConnector.prototype.create = function create(model, data, callback) {
    this.getResource(model).create(data, function (err, body, response) {
        if (err) {
            callback && callback(err, body);
            return;
        }
        if (response.statusCode === 200 || response.statusCode === 201) {
            callback && callback(null, body.id);
        } else {
            callback && callback('Error response: ' + response.statusCode, body);
        }
    });
};

/**
 * Update or create an instance of the model
 * @param {string} model The model name
 * @param {object} data The model instance data
 * @param {function} [callback] The callback function
 * */
RestConnector.prototype.updateOrCreate = function (model, data, callback) {
    var self = this;
    this.exists(model, data.id, function (err, exists) {
        if (exists) {
            self.save(model, data, callback);
        } else {
            self.create(model, data, function (err, id) {
                data.id = id;
                callback(err, data);
            });
        }
    });
};

/**
 * A factory to build callback function for a response
 * @param {string} model The model name
 * @param {function} [callback] The callback function
 * @returns {function}
 */
RestConnector.prototype.responseHandler = function(model, callback, many) {
    var self = this;
    return function (err, body, response) {
        if (err) {
            callback && callback(err, body);
            return;
        }
        if (response.statusCode === 200) {
            if(callback) {
                var result = self.postProcess(model, body, many);
                callback(null, result);
            }
        } else {
            callback && callback('Error response: ' + response.statusCode, body);
        }
    };
};

/**
 * Save an instance of a given model
 * @param {string} model The model name
 * @param {object} data The model instance data
 * @param {function} [callback] The callback function
 */
RestConnector.prototype.save = function save(model, data, callback) {
    this.getResource(model).update(data.id, data, this.responseHandler(model, callback));
};

/**
 * Check the existence of a given model/id
 * @param {string} model The model name
 * @param {*} id The id value
 * @param {function} [callback] The callback function
 */
RestConnector.prototype.exists = function exists(model, id, callback) {
    this.getResource(model).find(id, function (err, body, response) {
        if (err) {
            callback && callback(err, body);
            return;
        }
        if (response.statusCode === 200) {
            callback && callback(null, true);
        } else if (response.statusCode === 404) {
            callback && callback(null, false);
        } else {
            callback && callback('Error response: ' + response.statusCode, body);
        }
    });
};

/**
 * Find an instance of a given model/id
 * @param {string} model The model name
 * @param {*} id The id value
 * @param {function} [callback] The callback function
 */
RestConnector.prototype.find = function find(model, id, callback) {
    this.getResource(model).find(id, this.responseHandler(model, callback));
};

/**
 * Delete an instance for a given model/id
 * @param {string} model The model name
 * @param {*} id The id value
 * @param {function} [callback] The callback function
 */
RestConnector.prototype.destroy = function destroy(model, id, callback) {
    this.getResource(model).delete(id, this.responseHandler(model, callback));
};

/**
 * Query all instances for a given model based on the filter
 * @param {string} model The model name
 * @param {object} filter The filter object
 * @param {function} [callback] The callback function
 */
RestConnector.prototype.all = function all(model, filter, callback) {
    this.getResource(model).all(filter, this.responseHandler(model, callback, true));
};

/**
 * Delete all instances for a given model
 * @param {string} model The model name
 * @param {function} [callback] The callback function
 */
RestConnector.prototype.destroyAll = function destroyAll(model, callback) {
    this.getResource(model).deleteAll(this.responseHandler(model, callback));
};

/**
 * Count cannot not be supported efficiently.
 * @param {string} model The model name
 * @param {function} [callback] The callback function
 * @param {object} where The where object
 */
RestConnector.prototype.count = function count(model, callback, where) {
    throw new Error('Not supported');
};

/**
 * Update attributes for a given model/id
 * @param {string} model The model name
 * @param {*} id The id value
 * @param {object} data The model instance data
 * @param {function} [callback] The callback function
 */
RestConnector.prototype.updateAttributes = function (model, id, data, callback) {
    data.id = id;
    this.save(model, data, this.responseHandler(model, callback));
};




