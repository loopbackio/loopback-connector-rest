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
                console.log('Server listening on ', app.get('port'));
                done(err, data);
            });
        });

        after(function(done) {
            server && server.close(done);
        });

        it('should substitute the variables', function (done) {
            var builder = new RequestBuilder('GET', 'http://localhost:3000/{p}').query({x: '{x}', y: 2});
            builder.invoke({p: 1, x: 'X'},
                function (err, response, body) {
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
            var builder = new RequestBuilder('GET', 'http://localhost:3000/{p:100}').query({x: '{x:ME}', y: 2});
            builder.invoke({p: 1},
                function (err, response, body) {
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

        it('should build an operation with the parameter names', function (done) {
            var builder = new RequestBuilder('POST', 'http://localhost:3000/{p}').query({x: '{x}', y: 2});

            var fn = builder.operation(['p', 'x']);

            fn(1, 'X',
                function (err, response, body) {
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

    });
});