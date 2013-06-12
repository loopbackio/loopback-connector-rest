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
var traverse = require('traverse');
var request = require('request');

var RestResource = require('./rest');

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
        method = 'GET';
    }
    this._method = method || 'GET';
    this._query = {};
    this._headers = {};
    this._body = null;
    this._timeout = null;

    if (url && ('string' !== typeof url)) this._url = format(url);
    else this._url = url;

    this._attachments = [];

    if ('object' === typeof url) {
        var req = url;
        this._method = req._method || req.method || 'GET';
        this._url = req._url || req.url;
        this._headers = req._headers || req._headers || {};
        this._query = req._query || req.query || [];
        this._body = req._body || req.body;
        this._timeout = req.timeout || req.timeout;
        this._attachments = req._attachments || req.attachments || []
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
    this._attachments.push({
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
    this._maxRedirects = n;
    return this;
};


/**
 * Configure the url
 * @param url
 * @returns {*}
 */
RequestBuilder.prototype.url = function (url) {
    if ('string' != typeof url) this._url = format(url);
    else this._url = url;

    return this;
};

/**
 * Configure the HTTP method
 * @param method
 * @returns {*}
 */
RequestBuilder.prototype.method = function (method) {
    this._method = method;
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
    this._headers[field] = val;
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
    var cookies = this._headers['Cookie'];
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
        this._query[key] = params[key];
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
    var type = this._headers['Content-Type'];

    // merge
    if (obj && isObject(this._body)) {
        for (var key in body) {
            this._body[key] = body[key];
        }
        // string
    } else if ('string' == typeof body) {
        // default to x-www-form-urlencoded
        if (!type) this.type('form');
        type = this._headers['Content-Type'];

        // concat &
        if ('application/x-www-form-urlencoded' == type) {
            this._body = this._body
                ? this._body + '&' + body
                : body;
        } else {
            this._body = (this._body || '') + body;
        }
    } else {
        this._body = body;
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

RequestBuilder.prototype.timeout = function (ms) {
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

RequestBuilder.prototype.parse = function (fn) {
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

function copy(source, target, props) {
    if (typeof props === 'string') {
        props = [props];
    }
    target = target || {};
    props.forEach(function (p) {
        var val = source['_' + p];
        if (val !== null && val !== undefined) {
            // Empty array
            if (Array.isArray(val) && val.length === 0) {
                return;
            }
            // Empty object
            if (typeof val === 'object' && Object.keys(val).length === 0) {
                return;
            }
            target[p] = val;
        }
    });
    return target;
}

/**
 * Serialize the RequestBuilder to a JSON object
 * @returns {{method: *, url: *}}
 */
RequestBuilder.prototype.toJSON = function () {
    var props = [];
    var self = this;
    Object.keys(self).forEach(function (key) {
        if (key.charAt(0) === '_') {
            props.push(key.substring(1));
        }
    });
    var json = copy(this, {}, props);
    // console.log(json);
    return json;
}

/**
 * Load the REST request from a JSON object
 * @param req The request json object
 * @returns {RequestBuilder}
 */
RequestBuilder.fromJSON = function (req) {
    req = req || {};
    var options = {};
    Object.keys(req).forEach(function (key) {
        if (key.charAt(0) === '_') {
            options[key.substring(1)] = req[key];
        } else {
            options[key] = req[key];
        }
    });
    return new RequestBuilder(options);
}

/**
 * Build the request by expanding the templatized properties with the named values from options
 * @param options
 * @returns {*}
 */
RequestBuilder.prototype.build = function (options) {
    var result = traverse(this.toJSON()).map(function (x) {
        var match = null;
        var parsed = [];

        if (typeof x === 'string') {
            var index = 0;
            var matched = false;
            var templates = /\{([^\{\}]+)\}/g;
            // console.log(this.key, x);
            while (match = templates.exec(x)) {
                matched = true;
                // console.log(match);
                if (index < match.index) {
                    parsed.push(x.substring(index, match.index));
                }
                var param = /([^:=\s]+)\s*(=([^:]+))?(:(\w+))?/.exec(match[1]);
                if (!param || !param[1]) {
                    throw new Error('Invalid parameter: ' + match[1]);
                }
                var val = options[param[1]]; // Name is param[1]
                var type = param[5] || 'string'; // Type is param[5]

                val = (val === undefined || val === null) ? param[3] : val; // Default value is param[3]
                if (val !== undefined && val !== null) {
                    if (type.toLowerCase() === 'number') {
                        val = Number(val);
                    } else if (type.toLowerCase() === 'boolean') {
                        if (typeof val === 'string') {
                            val = (val.toLowerCase() !== 'false' && val);
                        } else {
                            val = !!val;
                        }
                    }
                    parsed.push(val);
                    console.log(type, val, typeof val);
                }
                index = match.index + match[0].length;
            }
            if (index < x.length) {
                // The rest
                parsed.push(x.substring(index));
            }
            var newValue = x;
            if (parsed.length === 1 && ('string' !== typeof parsed[0])) {
                newValue = parsed[0];
            } else {
                if (matched) {
                    newValue = parsed.join('');
                }
            }
            return matched ? newValue : x;
        } else {
            return x;
        }
    });
    console.log(result);
    var builder = RequestBuilder.fromJSON(result);
    // console.log(restConnector);
    return builder;
}

RequestBuilder.prototype.operation = function (parameterNames) {
    parameterNames = parameterNames || [];
    var params = [], match = null;
    var result = traverse(this.toJSON()).forEach(function (x) {
        if (typeof x === 'string') {
            var templates = /\{([^\{\}]+)\}/g;
            while (match = templates.exec(x)) {
                var param = /([^:=\s]+)\s*(=([^:]+))?(:(\w+))?/.exec(match[1]);
                if (!param || !param[1]) {
                    throw new Error('Invalid parameter: ' + match[1]);
                }
                params.push(param[1]);
            }
        }
    });

    var self = this;
    return function () {
        var options = {};
        var cb = null;
        // Check the last argument
        if (arguments.length > 0 && 'function' === typeof arguments[arguments.length - 1]) {
            cb = arguments[arguments.length - 1];
        }
        for (var i = 0; i < arguments.length; i++) {
            if (parameterNames[i]) {
                options[parameterNames[i]] = arguments[i];
            }
        }
        // console.log(options);
        self.invoke(options, cb);
    }

}

/**
 *
 * @param options
 * @param cb
 */
RequestBuilder.prototype.invoke = function (options, cb) {
    if (!cb && typeof options === 'function') {
        cb = options;
        options = {};
    }
    options = options || {};
    var json = this.build(options);
    var req = {
        method: json._method,
        uri: json._url,
        qs: json._query,
        headers: json._headers,
        timeout: json._timeout
    }
    if ((json._method.toUpperCase() === 'POST' || json._method.toUpperCase() === 'PUT') && json._body) {
        if ('object' === typeof json._body) {
            // console.log(json._body);
            req.json = json._body;
        } else {
            req.body = json._body;
        }
    }
    var r = request(req, cb);

    if (json._attachments && json._attachments.length > 0) {
        var form = r.form();
        json._attachments.forEach(function (a) {
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



