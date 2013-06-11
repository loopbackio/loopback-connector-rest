/**
 * REST spec builder
 */

/**
 * Module dependencies.
 */

var format = require('url').format;
var methods = require('methods');
var mime = require('mime');
var qs = require('qs');
var util = require('util');

module.exports = RequestBuilder;

function RequestBuilder(method, url) {
    if(!(this instanceof RequestBuilder)) {
        return new RequestBuilder(method, url);
    }
    if(arguments.length === 1) {
        url = method;
        method = 'GET';
    }
    this.method = method || 'GET';
    this.queryParameters = {};
    this.headers = {};

    if ('string' != typeof url) this.url = format(url);
    else this.url = url;

    this.method = method;
    this.attachments = [];

    if('object' === typeof url) {
        for(var key in url) {
            this[key] = url[key];
        }
    }
}

/**
 * Define "form" mime type.
 */

mime.define({
    'application/x-www-form-urlencoded': ['form', 'urlencoded', 'form-data']
});

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
    return null != obj && 'object' == typeof obj;
}

/**
 * Queue the given `file` as an attachment
 * with optional `filename`.
 *
 * @param {String} field
 * @param {String} file
 * @param {String} filename
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.attach = function(field, file, filename){
    this.attachments.push({
        field: field,
        path: file,
        filename: filename || file
    });
    return this;
};

/**
 * Set the max redirects to `n`.
 *
 * @param {Number} n
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.redirects = function(n){
    this._maxRedirects = n;
    return this;
};

/**
 * Return a new `Part` for this request.
 *
 * @return {Part}
 * @api public
 */

RequestBuilder.prototype.part = function(){
    return new Part(this);
};

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .header('Accept', 'application/json')
 *        .header('X-API-Key', 'foobar');
 *
 *      req.get('/')
 *        .header({ Accept: 'application/json', 'X-API-Key': 'foobar' });
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.header = function(field, val){
    if (isObject(field)) {
        for (var key in field) {
            this.header(key, field[key]);
        }
        return this;
    }
    this.headers[field] = val;
    return this;
};


/**
 * Set _Content-Type_ response header passed through `mime.lookup()`.
 *
 * Examples:
 *
 *      request.post('/')
 *        .type('xml')
 *        .data(xmlstring);
 *
 *      request.post('/')
 *        .type('json')
 *        .data(jsonstring);
 *
 *      request.post('/')
 *        .type('application/json')
 *        .data(jsonstring);
 *
 * @param {String} type
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.type = function(type){
    return this.header('Content-Type', ~type.indexOf('/')
        ? type
        : mime.lookup(type));
};

RequestBuilder.prototype.cookie = function (cookie) {
    var cookies = this.headers['Cookie'];
    if (!cookies) {
        cookies = [];
    }
    cookies.push(cookie);
    return this.header('Cookie', cookies.join(';'));
};

/**
 * Add query-string `val`.
 *
 * Examples:
 *
 *   request.get('/shoes')
 *     .query('size=10')
 *     .query({ color: 'blue' })
 *
 * @param {Object|String} val
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.query = function(val){
    var params = qs.parse(val);
    for(var key in params) {
        this.queryParameters[key] = params[key];
    }
    return this;
};

/**
 * Send `data`, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .data('{"name":"tj"}');
 *
 *       // auto json
 *       request.post('/user')
 *         .data({ name: 'tj' });
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .data('name=tj');
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .data({ name: 'tj' });
 *
 *       // string defaults to x-www-form-urlencoded
 *       request.post('/user')
 *         .data('name=tj')
 *         .data('foo=bar')
 *         .data('bar=baz');
 *
 * @param {String|Object} data
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.data = function(data){
    var obj = isObject(data);
    var type = this.headers['Content-Type'];

    // merge
    if (obj && isObject(this._data)) {
        for (var key in data) {
            this._data[key] = data[key];
        }
        // string
    } else if ('string' == typeof data) {
        // default to x-www-form-urlencoded
        if (!type) this.type('form');
        type = this.headers['Content-Type'];

        // concat &
        if ('application/x-www-form-urlencoded' == type) {
            this._data = this._data
                ? this._data + '&' + data
                : data;
        } else {
            this._data = (this._data || '') + data;
        }
    } else {
        this._data = data;
    }

    if (!obj) return this;

    // default to json
    if (!type) this.type('json');
    return this;
};

/**
 * Enable / disable buffering.
 *
 * @return {Boolean} [val]
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.buffer = function(val){
    this._buffer = false === val
        ? false
        : true;
    return this;
};

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.timeout = function(ms){
    this._timeout = ms;
    return this;
};

/**
 * Define the parser to be used for this response.
 *
 * @param {Function} fn
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.parse = function(fn){
    this._parser = fn;
    return this;
};


/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.auth = function(user, pass){
    var str = new Buffer(user + ':' + pass).toString('base64');
    return this.header('Authorization', 'Basic ' + str);
};


// generate HTTP verb methods

methods.forEach(function(method){
    var name = 'delete' == method ? 'del' : method;
    method = method.toUpperCase();
    RequestBuilder[name] = function(url){
        var req = new RequestBuilder(method, url);
        return req;
    };
});

RequestBuilder.prototype.build = function (options) {
    var ejs = require('ejs');

    var str = JSON.stringify(this);

    var options = options || {open: '{{', close: '}}'};

    var results = ejs.render(str, options);

    return JSON.parse(results);

}


