var request = require('request');

module.exports = RestResoure;

/**
 *
 * @param modelCtor
 * @param baseUrl
 * @returns {RestResoure}
 * @constructor
 */
function RestResoure(modelCtor, baseUrl) {
    if (!this instanceof RestResoure) {
        return new RestResoure(modelCtor, baseUrl);
    }
    this._model = modelCtor;
    this._url = baseUrl + '/' + this._model.pluralModelName;
}

/**
 *
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
 *
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
 *
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
 *
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
 *
 * @param query
 * @param cb
 */
RestResoure.prototype.query = function (q, cb) {
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



