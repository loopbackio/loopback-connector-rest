var assert = require('assert');

var RequestBuilder = require('../lib/rest-builder');

describe('REST Request Builder', function () {
    describe('Request templating', function () {

        var server = null;
        before(function (done) {
            var express = require('express');
            var app = express();

            app.configure(function () {
                app.set('port', process.env.PORT || 3000);
                app.set('views', __dirname + '/views');
                app.set('view engine', 'ejs');
                app.use(express.favicon());
                // app.use(express.logger('dev'));
                app.use(express.bodyParser());
                app.use(express.methodOverride());
                app.use(app.router);
            });

            app.all('*', function (req, res, next) {
                res.setHeader('Content-Type', 'application/json');
                var payload = {
                    method: req.method,
                    url: req.url,
                    headers: req.headers,
                    query: req.query,
                    body: req.body
                };
                res.json(200, payload);
            });


            server = app.listen(app.get('port'), function (err, data) {
                // console.log('Server listening on ', app.get('port'));
                done(err, data);
            });
        });

        after(function(done) {
            server && server.close(done);
        });

        it('should substitute the variables', function (done) {
            var builder = new RequestBuilder('GET', 'http://localhost:3000/{p}').query({x: '{x}', y: 2});
            builder.invoke({p: 1, x: 'X'},
                function (err, body, response) {
                    // console.log(response.headers);
                    assert.equal(200, response.statusCode);
                    if (typeof body === 'string') {
                        body = JSON.parse(body);
                    }
                    // console.log(body);
                    assert.equal(body.query.x, 'X');
                    assert.equal(body.query.y, 2);
                    done(err, body);
                });
        });

        it('should support default variables', function (done) {
            var builder = new RequestBuilder('GET', 'http://localhost:3000/{p=100}').query({x: '{x=ME}', y: 2});
            builder.invoke({p: 1},
                function (err, body, response) {
                    // console.log(response.headers);
                    assert.equal(200, response.statusCode);
                    if (typeof body === 'string') {
                        body = JSON.parse(body);
                    }
                    // console.log(body);
                    assert.equal(0, body.url.indexOf('/1'));
                    assert.equal('ME', body.query.x);
                    assert.equal(2, body.query.y);
                    done(err, body);
                });
        });

        it('should support typed variables', function (done) {
            var builder = new RequestBuilder('POST', 'http://localhost:3000/{p=100}').query({x: '{x=100:number}', y: 2})
                .body({a: '{a=1:number}', b: '{b=true:boolean}'});
            builder.invoke({p: 1, a: 100, b: false},
                function (err, body, response) {
                    // console.log(response.headers);
                    assert.equal(200, response.statusCode);
                    if (typeof body === 'string') {
                        body = JSON.parse(body);
                    }
                    // console.log(body);
                    assert.equal(0, body.url.indexOf('/1'));
                    assert.equal(100, body.query.x);
                    assert.equal(2, body.query.y);
                    assert.equal(100, body.body.a);
                    assert.equal(false, body.body.b);
                    done(err, body);
                });
        });

        it('should report missing required variables', function (done) {
            var builder = new RequestBuilder('POST', 'http://localhost:3000/{!p}').query({x: '{x=100:number}', y: 2})
                .body({a: '{^a:number}', b: '{!b=true:boolean}'});
            try {
            builder.invoke({a: 100, b: false},
                function (err, body, response) {
                    // console.log(response.headers);
                    assert.equal(200, response.statusCode);
                    if (typeof body === 'string') {
                        body = JSON.parse(body);
                    }
                    // console.log(body);
                    done(err, body);
                });
                assert.fail();
            } catch(err) {
                // This is expected
                done(null, null);
            }
        });

        it('should support required variables', function (done) {
            var builder = new RequestBuilder('POST', 'http://localhost:3000/{!p}').query({x: '{x=100:number}', y: 2})
                .body({a: '{^a:number}', b: '{!b=true:boolean}'});

            builder.invoke({p: 1, a: 100, b: false},
                function (err, body, response) {
                    // console.log(response.headers);
                    assert.equal(200, response.statusCode);
                    if (typeof body === 'string') {
                        body = JSON.parse(body);
                    }
                    // console.log(body);
                    assert.equal(0, body.url.indexOf('/1'));
                    assert.equal(100, body.query.x);
                    assert.equal(2, body.query.y);
                    assert.equal(100, body.body.a);
                    assert.equal(false, body.body.b);
                    done(err, body);
                });

        });

        it('should build an operation with the parameter names', function (done) {
            var builder = new RequestBuilder('POST', 'http://localhost:3000/{p}').query({x: '{x}', y: 2});

            var fn = builder.operation(['p', 'x']);

            fn(1, 'X',
                function (err, body, response) {
                    assert.equal(200, response.statusCode);
                    if (typeof body === 'string') {
                        body = JSON.parse(body);
                    }
                    // console.log(body);
                    assert.equal(0, body.url.indexOf('/1'));
                    assert.equal('X', body.query.x);
                    assert.equal(2, body.query.y);
                    // console.log(body);
                    done(err, body);
                });
        });

        it('should build an operation with the parameter names as args', function (done) {
            var builder = new RequestBuilder('POST', 'http://localhost:3000/{p}').query({x: '{x}', y: 2});

            var fn = builder.operation('p', 'x');

            fn(1, 'X',
                function (err, body, response) {
                    assert.equal(200, response.statusCode);
                    if (typeof body === 'string') {
                        body = JSON.parse(body);
                    }
                    // console.log(body);
                    assert.equal(0, body.url.indexOf('/1'));
                    assert.equal('X', body.query.x);
                    assert.equal(2, body.query.y);
                    // console.log(body);
                    done(err, body);
                });
        });

        it('should build from a json doc', function (done) {
            var builder = new RequestBuilder(require('./request-template.json'));
            // console.log(builder.parse());
            builder.invoke({p: 1, a: 100, b: false},
                function (err, body, response) {
                    // console.log(response.headers);
                    assert.equal(200, response.statusCode);
                    if (typeof body === 'string') {
                        body = JSON.parse(body);
                    }
                    // console.log(body);
                    assert.equal(0, body.url.indexOf('/1'));
                    assert.equal(100, body.query.x);
                    assert.equal(2, body.query.y);
                    assert.equal(100, body.body.a);
                    assert.equal(false, body.body.b);
                    done(err, body);
                });
        });


    });
});