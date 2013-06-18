var request = require('request');

module.exports = RestResoure;

/**
 * Build a REST resource client for CRUD operations
 * @param modelCtor The model constructor
 * @param baseUrl The base URL
 * @returns {RestResoure}
 * @constructor
 */
function RestResoure(pluralModelName, baseUrl) {
    if (!this instanceof RestResoure) {
        return new RestResoure(pluralModelName, baseUrl);
    }
    this._url = baseUrl + '/' + pluralModelName;
}

/**
 * Map the create operation to HTTP POST /{model}
 * @param obj
 * @param cb
 */
RestResoure.prototype.create = function (obj, cb) {
    request(
        {
            method: 'POST',
            uri: this._url,
            json: true,
            body: obj
        },
        cb
    )
}

/**
 * Map the update operation to POST /{model}/{id}
 * @param id
 * @param obj
 * @param cb
 */
RestResoure.prototype.update = function (id, obj, cb) {
    request(
        {
            method: 'PUT',
            uri: this._url + '/' + id,
            json: true,
            body: obj
        },
        cb
    )
}

/**
 * Map the delete operation to POST /{model}/{id}
 * @param id
 * @param cb
 */
RestResoure.prototype.delete = function (id, cb) {
    request(
        {
            method: 'DELETE',
            uri: this._url + '/' + id,
            json: true
        },
        cb
    )
}

/**
 * Map the delete operation to POST /{model}
 * @param id
 * @param cb
 */
RestResoure.prototype.deleteAll = function (cb) {
    request(
        {
            method: 'DELETE',
            uri: this._url,
            json: true
        },
        cb
    )
}

/**
 * Map the find operation to GET /{model}/{id}
 * @param id
 * @param cb
 */
RestResoure.prototype.find = function (id, cb) {
    request(
        {
            method: 'GET',
            uri: this._url + '/' + id,
            json: true
        },
        cb
    )
}

/**
 * Map the all/query operation to GET /{model}
 * @param query
 * @param cb
 */
RestResoure.prototype.all = RestResoure.prototype.query = function (q, cb) {
    if(!cb && typeof q === 'function') {
        cb = q;
        q = {};
    }
    var url = this._url;
    request(
        {
            method: 'GET',
            uri: url,
            json: true,
            qs: q
        },
        cb
    )
}



