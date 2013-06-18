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
var request = require('request');

var JsonTemplate = require('./template');
var RestResource = require('./rest-model');

module.exports = RequestBuilder;

/**
 *
 * @param method
 * @param url
 * @returns {RequestBuilder}
 * @constructor
 */
function RequestBuilder(method, url) {
    if (!(this instanceof RequestBuilder)) {
        return new RequestBuilder(method, url);
    }
    if (arguments.length === 1) {
        url = method;
        method = null;
    }

    if ('object' === typeof url) {
        this.template = new JsonTemplate(url);
    } else {
        var obj = {};
        obj.method = method || 'GET';
        obj.query = {};
        obj.headers = {};

        if (url && ('string' !== typeof url)) obj.url = format(url);
        else obj.url = url;

        obj.attachments = [];
        this.template = new JsonTemplate(obj);
    }

}

/**
 * Define "form" mime type.
 */

mime.define({
    'application/x-www-form-urlencoded': ['form', 'urlencoded', 'form-body']
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

RequestBuilder.prototype.debug = function (enabled) {
    this._debug = enabled;
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

RequestBuilder.prototype.attach = function (field, file, filename) {
    this.template.template.attachments.push({
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

RequestBuilder.prototype.redirects = function (n) {
    this.template.template.maxRedirects = n;
    return this;
};


/**
 * Configure the url
 * @param url
 * @returns {*}
 */
RequestBuilder.prototype.url = function (url) {
    if ('string' != typeof url) this.template.template.url = format(url);
    else this.template.template.url = url;

    return this;
};

/**
 * Configure the HTTP method
 * @param method
 * @returns {*}
 */
RequestBuilder.prototype.method = function (method) {
    this.template.template.method = method;
    return this;
};

RequestBuilder.prototype.timeout = function (timeout) {
    this.timeout = timeout;
    return this;
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

RequestBuilder.prototype.header = function (field, val) {
    if (isObject(field)) {
        for (var key in field) {
            this.header(key, field[key]);
        }
        return this;
    }
    this.template.template.headers[field] = val;
    return this;
};


/**
 * Set _Content-Type_ response header passed through `mime.lookup()`.
 *
 * Examples:
 *
 *      request.post('/')
 *        .type('xml')
 *        .body(xmlstring);
 *
 *      request.post('/')
 *        .type('json')
 *        .body(jsonstring);
 *
 *      request.post('/')
 *        .type('application/json')
 *        .body(jsonstring);
 *
 * @param {String} type
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.type = function (type) {
    return this.header('Content-Type', ~type.indexOf('/')
        ? type
        : mime.lookup(type));
};

RequestBuilder.prototype.cookie = function (cookie) {
    var cookies = this.template.template.headers['Cookie'];
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

RequestBuilder.prototype.query = function (val) {
    var params = qs.parse(val);
    for (var key in params) {
        this.template.template.query[key] = params[key];
    }
    return this;
};

/**
 * Send `body`, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .body('{"name":"tj"}');
 *
 *       // auto json
 *       request.post('/user')
 *         .body({ name: 'tj' });
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .body('name=tj');
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .body({ name: 'tj' });
 *
 *       // string defaults to x-www-form-urlencoded
 *       request.post('/user')
 *         .body('name=tj')
 *         .body('foo=bar')
 *         .body('bar=baz');
 *
 * @param {String|Object} body
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.body = function (body) {
    var obj = isObject(body);
    var type = this.template.template.headers['Content-Type'];

    // merge
    if (obj && isObject(this.template.template.body)) {
        for (var key in body) {
            this.template.template.body[key] = body[key];
        }
        // string
    } else if ('string' == typeof body) {
        // default to x-www-form-urlencoded
        if (!type) this.type('form');
        type = this.template.template.headers['Content-Type'];

        // concat &
        if ('application/x-www-form-urlencoded' == type) {
            this.template.template.body = this.template.template.body
                ? this.template.template.body + '&' + body
                : body;
        } else {
            this.template.template.body = (this.template.template.body || '') + body;
        }
    } else {
        this.template.template.body = body;
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

RequestBuilder.prototype.buffer = function (val) {
    this.template.template.buffer = false === val
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

RequestBuilder.prototype.timeout = function (ms) {
    this.template.template.timeout = ms;
    return this;
};

/**
 * Define the parser to be used for this response.
 *
 * @param {Function} fn
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.parse = function (fn) {
    this.template.template.parser = fn;
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

RequestBuilder.prototype.auth = function (user, pass) {
    var str = new Buffer(user + ':' + pass).toString('base64');
    return this.header('Authorization', 'Basic ' + str);
};


// generate HTTP verb methods

methods.forEach(function (method) {
    var name = 'delete' == method ? 'del' : method;
    method = method.toUpperCase();
    RequestBuilder[name] = function (url) {
        var req = new RequestBuilder(method, url);
        return req;
    };
});

/**
 * Serialize the RequestBuilder to a JSON object
 * @returns {{method: *, url: *}}
 */
RequestBuilder.prototype.toJSON = function () {
    return this.template.template;
}

/**
 * Load the REST request from a JSON object
 * @param req The request json object
 * @returns {RequestBuilder}
 */
RequestBuilder.compile = RequestBuilder.fromJSON = function (req) {
    return new RequestBuilder(req);
}


/**
 * Build the request by expanding the templatized properties with the named values from options
 * @param options
 * @returns {*}
 */
RequestBuilder.prototype.build = function (parameters) {
    return this.template.build(parameters);
}

/**
 * Map the request builder to a function
 * @param parameterNames The parameter names that define the order of args. It be an array of strings or multiple string arguments
 * @returns {Function}
 */
RequestBuilder.prototype.operation = function (parameterNames) {
    var params = [];
    Array.prototype.slice.call(arguments).forEach(function (a) {
        if ('string' === typeof a) {
            params.push(a);
        } else if (Array.isArray(a)) {
            a.forEach(function (p) {
                params.push(p);
            });
        }
    });
    // console.log(params);

    // var schema = this.parse();

    var self = this;
    return function () {
        var parameters = {};
        var cb = null;
        // Check the last argument
        var size = arguments.length;
        if (arguments.length > 0 && 'function' === typeof arguments[arguments.length - 1]) {
            cb = arguments[arguments.length - 1];
            size--;
        }
        for (var i = 0; i < size; i++) {
            if (params[i]) {
                parameters[params[i]] = arguments[i];
            }
        }
        // console.log(parameters);
        self.invoke(parameters, cb);
    }

}

/**
 * Invoke a REST API with the provided parameter values in the parameters object
 * @param parameters An object that provide {name: value} for parameters
 * @param cb
 */
RequestBuilder.prototype.invoke = function (parameters, cb) {
    if (!cb && typeof parameters === 'function') {
        cb = parameters;
        parameters = {};
    }
    parameters = parameters || {};
    var json = this.build(parameters);
    var req = {
        method: json.method,
        uri: json.url,
        qs: json.query,
        headers: json.headers,
        timeout: json.timeout
    }

    if (json.body !== undefined) {
        req.body = json.body;
    }

    // Try to set up the json flag
    if (req.headers) {
        for (var h in req.headers) {
            if (h.toLowerCase() === 'accepts' || h.toLowerCase() === 'content-type') {
                if (req.headers[h] === 'application/json') {
                    req.json = true;
                }
            }
        }
    }

    if(this._debug) {
        console.log('Reuest: ', req);
    }
    var r = request(req, cb);

    if (json.attachments && json.attachments.length > 0) {
        var form = r.form();
        json.attachments.forEach(function (a) {
            form.append(a.field, fs.createReadStream(path.join(__dirname, a.path)), a);
        });
    }
};

/**
 * Attach a model to the REST connector
 * @param modelCtor
 * @param baseUrl
 * @returns {RestResource}
 */
RequestBuilder.resource = function (modelCtor, baseUrl) {
    return new RestResource(modelCtor, baseUrl);
}

/**
 * Delegation to request
 * @type {*}
 */
RequestBuilder.request = request;



