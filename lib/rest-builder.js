/**
 * REST request spec builder
 */

var format = require('url').format;
var methods = require('methods');
var mime = require('mime');
var qs = require('qs');
var request = require('request');

var JsonTemplate = require('./template');
var RestResource = require('./rest-model');

var jsonPath = null;
try {
    jsonPath = require('JSONPath');
} catch(err) {
    // Ignore
}

module.exports = RequestBuilder;

/**
 * RequestBuilder constructor
 *
 * @param {string} [method] HTTP method
 * @param {string|object} url The HTTP URL or an object for the options including method, url properties
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
        else  {
            obj.url = url;
        }

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
 * @param {object} obj
 * @return {boolean}
 * @api private
 */

function isObject(obj) {
    return null !== obj && 'object' === typeof obj;
}

/**
 * Turn on/off debug
 * @param {boolean} enabled Set it true to enable debug or false to disable debug
 */
RequestBuilder.prototype.debug = function (enabled) {
    this._debug = enabled;
};

/**
 * Queue the given `file` as an attachment
 * with optional `filename`.
 *
 * @param {string} field
 * @param {string} file
 * @param {string} filename
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
 * @param {number} n
 * @return {RequestBuilder} for chaining
 * @api public
 */

RequestBuilder.prototype.redirects = function (n) {
    this.template.template.maxRedirects = n;
    return this;
};


/**
 * Configure the url
 * @param {string} url The HTTP URL
 * @returns {REquestBuilder}
 */
RequestBuilder.prototype.url = function (url) {
    if ('string' !== typeof url)  {
        this.template.template.url = format(url);
    }
    else {
        this.template.template.url = url;
    }

    return this;
};

/**
 * Configure the HTTP method
 * @param {string} method The HTTP method
 * @returns {RequestBuilder}
 */
RequestBuilder.prototype.method = function (method) {
    this.template.template.method = method;
    return this;
};

/**
 * Configure the timeout
 * @param {number} timeout The timeout value in ms
 * @returns {RequestBuilder}
 */
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
 * @param {string|object} field
 * @param {string} val
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
 * @param {string} type
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
 * @param {object|string} val
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
 * @param {string|object} body
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
 * Set the response json path
 * @param {string} responsePath The JSONPath to be applied against the HTTP body
 * @returns {RequestBuilder}
 */
RequestBuilder.prototype.responsePath = function (responsePath) {
    this.template.template.responsePath = responsePath;
    return this;
};

/**
 * Define the parser to be used for this response.
 *
 * @param {function} fn The parser function
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
 * @param {string} user The user name
 * @param {string} pass The password
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
 * @param {object} req The request json object
 * @returns {RequestBuilder}
 */
RequestBuilder.compile = RequestBuilder.fromJSON = function (req) {
    return new RequestBuilder(req);
}


/**
 * Build the request by expanding the templatized properties with the named values from options
 * @param {object} options
 * @returns {*}
 */
RequestBuilder.prototype.build = function (parameters) {
    return this.template.build(parameters);
}

/**
 * Map the request builder to a function
 * @param {[string]} parameterNames The parameter names that define the order of args. It be an array of strings or multiple string arguments
 * @returns {function} A function to invoke the REST operation
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
    };

};

/**
 * Invoke a REST API with the provided parameter values in the parameters object
 * @param {object} parameters An object that provide {name: value} for parameters
 * @param {function} cb The callback function
 */
RequestBuilder.prototype.invoke = function (parameters, cb) {
    if (!cb && typeof parameters === 'function') {
        cb = parameters;
        parameters = {};
    }
    parameters = parameters || {};
    var json = this.build(parameters);

    for(var q in json.query) {
        if(json.query[q] === undefined || json.query[q] === null) {
            delete json.query[q];
        }
    }
    for(var h in json.headers) {
        if(json.headers[h] === undefined || json.headers[h] === null) {
            delete json.headers[h];
        }
    }
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
                } else {
                    req.json = false;
                }
            }
        }
    }

    if(req.json === undefined) {
        // Default to json
        req.json = true;
    }

    if(this._debug) {
        console.dir(req);
    }

    var callback = cb;
    var self = this;
    if(cb) {
        callback = function(err, response, body) {
            if(err) {
                return cb(err, body, response);
            } else {
                var result = body;
                if(jsonPath && self.template.template.responsePath) {
                    result = jsonPath.eval(body, self.template.template.responsePath);
                }
                return cb(err, result, response);
            }
        };
    }
    var r = request(req, callback);

    if (json.attachments && json.attachments.length > 0) {
        var form = r.form();
        json.attachments.forEach(function (a) {
            form.append(a.field, fs.createReadStream(path.join(__dirname, a.path)), a);
        });
    }
};

/**
 * Attach a model to the REST connector
 * @param {function} modelCtor The model constructor
 * @param {string} baseUrl The base URL
 * @returns {RestResource}
 */
RequestBuilder.resource = function (modelCtor, baseUrl) {
    return new RestResource(modelCtor, baseUrl);
};

/**
 * Delegation to request
 * Please note the cb takes (err, body, response)
 * @param {string} uri The HTTP URI
 * @param {options} options The options
 * @param {function} cb The callback function
 */
RequestBuilder.request = function (uri, options, cb) {
    if (typeof uri === 'undefined') {
        throw new Error('undefined is not a valid uri or options object.')
    }
    if ((typeof options === 'function') && !cb) {
        cb = options;
    }
    if (options && typeof options === 'object') {
        options.uri = uri;
    } else if (typeof uri === 'string') {
        options = {uri:uri}
    } else {
        options = uri
    }

    var callback = cb;
    if (cb) {
        callback = function (err, response, body) {
            return cb(err, body, response);
        };
    }
    return request(options, callback);
};



