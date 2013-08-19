var assert = require('assert');

var DataSource = require('loopback-datasource-juggler').DataSource;
var ds = new DataSource(require('../lib/rest-connector'), {baseURL: 'http://localhost:3000'});

// simplier way to describe model
var User = ds.define('User', {
    name: String,
    bio: DataSource.Text,
    approved: Boolean,
    joinedAt: Date,
    age: Number
}, {plural: 'Users'});

ds.attach(User);

describe('REST connector', function () {
    describe('CRUD apis', function () {

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


            var count = 2;
            var users = [new User({id: 1, name: 'Ray'}), new User({id: 2, name: 'Joe'})]

            app.get('/Users', function (req, res, next) {
                res.setHeader('Content-Type', 'application/json');
                res.json(200, users);
            });

            app.post('/Users', function (req, res, next) {
                res.setHeader('Content-Type', 'application/json');
                var body = req.body;
                if (!body.id) {
                    body.id = (++count);
                }
                res.setHeader('Location', req.protocol + '://' + req.headers['host'] + '/' + body.id);
                users.push(body);
                res.json(201, body);
            });

            app.put('/Users/:id', function (req, res, next) {
                for (var i = 0; i < users.length; i++) {
                    var user = users[i];
                    if (user.id == req.params.id) {
                        res.setHeader('Content-Type', 'application/json');
                        users[i] = req.body;
                        res.send(200);
                        return;
                    }
                }
                res.send(404);
            });

            app.delete('/Users/:id', function (req, res, next) {
                for (var i = 0; i < users.length; i++) {
                    var user = users[i];
                    if (user.id == req.params.id) {
                        res.setHeader('Content-Type', 'application/json');
                        users.splice(i, 1);
                        res.send(200);
                        return;
                    }
                }
                res.send(404);
            });

            app.get('/Users/:id', function (req, res, next) {
                for (var i = 0; i < users.length; i++) {
                    var user = users[i];
                    if (user.id == req.params.id) {
                        res.setHeader('Content-Type', 'application/json');
                        res.json(200, user);
                        return;
                    }
                }
                res.send(404);
            });

            server = app.listen(app.get('port'), function (err, data) {
                // console.log('Server listening on ', app.get('port'));
                done(err, data);
            });
        });

        after(function (done) {
            server && server.close(done);
        });

        it('should find two users', function (done) {

            User.find(function (err, body) {
                // console.log(body);
                assert.equal(2, body.length);
                done(err, body);
            });
        });


        it('should find the user with id 1', function (done) {
            User.findById(1, function (err, body) {
                // console.log(body);
                assert.equal(1, body.id);
                assert.equal('Ray', body.name);
                done(err, body);
            });
        });

        it('should not find the user with id 100', function (done) {
            User.findById(100, function (err, body) {
                // console.log(err, body);
                assert.ok(err);
                done(null, body);
            });
        });

        it('should update user 1', function (done) {
            new User({id: 1, name: 'Raymond'}).save(function (err, body) {
                // console.log(err, body);
                done(err, body);
            });
        });

        it('should delete user 1', function (done) {
            User.findById(1, function (err, body) {
                // console.log(body);
                assert.equal(1, body.id);
                assert.equal('Raymond', body.name);

                body.destroy(function (err, body) {
                    // console.log(err, body);
                    done(err, body);
                });
            });
        });

        it('should create a new id named Mary', function (done) {
            User.create({name: 'Mary'}, function (err, body) {
                // console.log(body);
                done(err, body);
            });
        });

        it('should list all users', function (done) {
            User.find(function (err, body) {
                // console.log(body);
                assert.equal(2, body.length);
                done(err, body);
            });
        });

    });
});
