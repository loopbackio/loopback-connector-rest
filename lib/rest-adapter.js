var RestResource = require('../rest-model');

/**
 * Export the initialize method to JDB
 * @param schema
 * @param callback
 */
exports.initialize = function initializeRest(schema, callback) {
    var settings = schema.settings || {};
    var baseURL = settings.baseURL || settings.restPath || 'http://localhost:3000/';

    schema.adapter = new Rest(baseURL);
    schema.adapter.schema = schema;

    callback && process.nextTick(callback);
};


/**
 * The Rest adapter constructor
 * @param baseURL The base URL
 * @constructor
 */
function Rest(baseURL) {
    this.baseURL = baseURL;
    this._models = {};
    this._resources = {};
}

/**
 * Define a model
 * @param descr The model description
 */
Rest.prototype.define = function defineModel(descr) {
    var m = descr.model.modelName;
    this.installPostProcessor(descr);
    this._models[m] = descr;
    this._resources[m] = new RestResource(descr.model.pluralModelName, this.baseURL);
};

/**
 * Install the post processor
 * @param descr
 */
Rest.prototype.installPostProcessor = function installPostProcessor(descr) {
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
Rest.prototype.preProcess = function preProcess(data) {
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
Rest.prototype.postProcess = function postProcess(model, data, many) {
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
Rest.prototype.getResource = function getResourceUrl(model) {
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
Rest.prototype.create = function create(model, data, callback) {
    this.getResource(model).create(data, function (err, response, body) {
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
Rest.prototype.updateOrCreate = function (model, data, callback) {
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
function responseHandler(model, callback) {
    return function (err, response, body) {
        if (err) {
            callback && callback(err, body);
            return;
        }
        if (response.statusCode === 200) {
            callback && self.postProcess(model, body) && callback(null, body);
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
Rest.prototype.save = function save(model, data, callback) {
    this.getResource(model).update(data.id, data, responseHandler(model, callback));
};

/**
 * Check the existence of a given model/id
 * @param model
 * @param id
 * @param callback
 */
Rest.prototype.exists = function exists(model, id, callback) {
    this.getResource(model).find(id, function (err, response, body) {
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
Rest.prototype.find = function find(model, id, callback) {
    this.getResource(model).find(id, responseHandler(model, callback));
};

/**
 * Delete an instance for a given model/id
 * @param model
 * @param id
 * @param callback
 */
Rest.prototype.destroy = function destroy(model, id, callback) {
    this.getResource(model).delete(id, responseHandler(model, callback));
};

/**
 * Query all instances for a given model based on the filter
 * @param model
 * @param filter
 * @param callback
 */
Rest.prototype.all = function all(model, filter, callback) {
    this.getResource(model).all(filter, responseHandler(model, callback, true));
};

/**
 * Delete all instances for a given model
 * @param model
 * @param callback
 */
Rest.prototype.destroyAll = function destroyAll(model, callback) {
    this.getResource(model).deleteAll(responseHandler(model, callback));
};

/**
 * Count cannot not be supported efficiently.
 * @param model
 * @param callback
 * @param where
 */
Rest.prototype.count = function count(model, callback, where) {
    throw new Error('Not supported');
};

/**
 * Update attributes for a given model/id
 * @param model
 * @param id
 * @param data
 * @param callback
 */
Rest.prototype.updateAttributes = function (model, id, data, callback) {
    data.id = id;
    this.save(model, data, responseHandler(model, callback));
};




