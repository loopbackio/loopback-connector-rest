var RestResource = require('./rest-model');
var RequestBuilder = require('./rest-builder');

/**
 * Export the initialize method to loopback-datasource-juggler
 * @param dataSource
 * @param callback
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
    var settings = dataSource.settings || {};
    var baseURL = settings.baseURL || settings.restPath || 'http://localhost:3000/';


    var connector = new RestConnector(baseURL, settings.debug);
    dataSource.connector = connector;
    dataSource.connector.dataSource = dataSource;

    var DataAccessObject = function() {};

    // Copy the methods from default DataAccessObject
    if(dataSource.constructor.DataAccessObject) {
        for(var i in dataSource.constructor.DataAccessObject) {
            DataAccessObject[i] = dataSource.constructor.DataAccessObject[i];
        };
        for(var i in dataSource.constructor.DataAccessObject.prototype) {
            DataAccessObject.prototype[i] = dataSource.constructor.DataAccessObject.prototype[i];
        };
    }
    connector.DataAccessObject = DataAccessObject;

    if (settings.operations) {
        settings.operations.forEach(function (op) {
            if (!op.template) {
                throw new Error('The operation template is missing: ', op);
            }
            var builder = RequestBuilder.compile(op.template);
            builder.debug(settings.debug);

            // Bind all the functions to the template
            var functions = op.functions;
            if (functions) {
                for (var f in functions) {
                    if (settings.debug) {
                        console.log('Mixing in method: ', f, functions[f]);
                    }
                    var fn = builder.operation(functions[f]);
                    dataSource[f] = fn;

                    fn.accepts = [];
                    fn.shared = true;
                    var args = builder.template.compile();
                    functions[f].forEach(function (p) {
                        fn.accepts.push({arg: p, type: args[p].type, required: args[p].required});
                    });
                    fn.returns = {arg: 'data', type: 'object', root: true};
                    // dataSource.defineOperation(f, fn, fn);
                    DataAccessObject[f] = fn;
                }
            }
            // Inject the invoke function
            var fn = function () {
                return builder.invoke.apply(builder, arguments);
            }
            var name = 'invoke';

            if (settings.debug) {
                console.log('Mixing in method: ', name);
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


/**
 * The RestConnector constructor
 * @param baseURL The base URL
 * @constructor
 */
function RestConnector(baseURL, debug) {
    this._baseURL = baseURL;
    this._models = {};
    this._resources = {};
    this._debug = debug;
}

/**
 * Define a model
 * @param descr The model description
 */
RestConnector.prototype.define = function defineModel(descr) {
    var m = descr.model.modelName;
    this.installPostProcessor(descr);
    this._models[m] = descr;
    this._resources[m] = new RestResource(descr.model.pluralModelName, this._baseURL);
    this._resources[m].debug(this._debug);
};

/**
 * Install the post processor
 * @param descr
 */
RestConnector.prototype.installPostProcessor = function installPostProcessor(descr) {
    var dates = [];
    Object.keys(descr.properties).forEach(function (column) {
        if (descr.properties[column].type.name === 'Date') {
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
    };

    descr.postProcessor = postProcessor;
};

/**
 * Pre-process the request data
 * @param data
 * @returns {{}}
 */
RestConnector.prototype.preProcess = function preProcess(data) {
    var result = {};
    Object.keys(data).forEach(function (key) {
        if (data[key] != null) {
            result[key] = data[key];
        }
    })
    return result;
};

/**
 * Post-process the response data
 * @param model
 * @param data
 * @param many
 */
RestConnector.prototype.postProcess = function postProcess(model, data, many) {
    var postProcessor = this._models[model].postProcessor;
    if (postProcessor && data) {
        if (!many) {
            postProcessor(data);
        } else {
            var size = data.length;
            for (var i = 0; i < size; i++) {
                if (data[i]) {
                    postProcessor(data[i]);
                }
            }
            ;
        }
    }
};

/**
 * Get a REST resource client for the given model
 * @param model
 * @returns {*}
 */
RestConnector.prototype.getResource = function getResourceUrl(model) {
    var resource = this._resources[model];
    if (!resource) throw new Error('Resource for ' + model + ' is not defined');
    return resource;
};


/**
 * Create an instance of the model with the given data
 * @param model The model name
 * @param data The data
 * @param callback
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
 * @param model The model name
 * @param data
 * @param callback
 */
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
 * A factory to build callback function for a
 * @param model
 * @param callback
 * @returns {Function}
 */
RestConnector.prototype.responseHandler = function(model, callback) {
    var self = this;
    return function (err, body, response) {
        if (err) {
            callback && callback(err, body);
            return;
        }
        if (response.statusCode === 200) {
            if(callback) {
                self.postProcess(model, body);
                callback(null, body);
            }
        } else {
            callback && callback('Error response: ' + response.statusCode, body);
        }
    };
}

/**
 * Save an instance of a given model
 * @param model
 * @param data
 * @param callback
 */
RestConnector.prototype.save = function save(model, data, callback) {
    this.getResource(model).update(data.id, data, this.responseHandler(model, callback));
};

/**
 * Check the existence of a given model/id
 * @param model
 * @param id
 * @param callback
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
 * @param model
 * @param id
 * @param callback
 */
RestConnector.prototype.find = function find(model, id, callback) {
    this.getResource(model).find(id, this.responseHandler(model, callback));
};

/**
 * Delete an instance for a given model/id
 * @param model
 * @param id
 * @param callback
 */
RestConnector.prototype.destroy = function destroy(model, id, callback) {
    this.getResource(model).delete(id, this.responseHandler(model, callback));
};

/**
 * Query all instances for a given model based on the filter
 * @param model
 * @param filter
 * @param callback
 */
RestConnector.prototype.all = function all(model, filter, callback) {
    this.getResource(model).all(filter, this.responseHandler(model, callback, true));
};

/**
 * Delete all instances for a given model
 * @param model
 * @param callback
 */
RestConnector.prototype.destroyAll = function destroyAll(model, callback) {
    this.getResource(model).deleteAll(this.responseHandler(model, callback));
};

/**
 * Count cannot not be supported efficiently.
 * @param model
 * @param callback
 * @param where
 */
RestConnector.prototype.count = function count(model, where, callback) {
    throw new Error('Not supported');
};

/**
 * Update attributes for a given model/id
 * @param model
 * @param id
 * @param data
 * @param callback
 */
RestConnector.prototype.updateAttributes = function (model, id, data, callback) {
    data.id = id;
    this.save(model, data, this.responseHandler(model, callback));
};




