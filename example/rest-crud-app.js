var ModelBuilder = require('loopback-datasource-juggler').ModelBuilder;
var modelBuilder = new ModelBuilder();

// simplier way to describe model
var User = modelBuilder.define('User', {
    name: String,
    bio: ModelBuilder.Text,
    approved: Boolean,
    joinedAt: Date,
    age: Number
});

console.log(User.modelName);

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
    res.json(users);
    res.end();
});

app.post('/Users', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    var body = req.body;
    if(!body.id) {
        body.id = (++count);
    }
    res.setHeader('Location', req.protocol + '://' + req.headers['host'] + '/' + body.id);
    users.push(body);
    res.json(201, body);
    res.end();
});

app.put('/Users/:id', function (req, res, next) {
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        if (user.id == req.id) {
            res.setHeader('Content-Type', 'application/json');
            users[i] = body;
            res.end(null, 200);
            return;
        }
    }
    res.end(null, 404);
});

app.delete('/Users/:id', function (req, res, next) {
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        if (user.id == req.params.id) {
            res.setHeader('Content-Type', 'application/json');
            users.splice(i, 1);
            res.end(null, 200);
            return;
        }
    }
    res.end(404);
});

app.get('/Users/:id', function (req, res, next) {
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        if (user.id == req.params.id) {
            res.setHeader('Content-Type', 'application/json');
            res.json(user);
            res.end();
            return;
        }
    }
});

app.listen(app.get('port'), function (err, data) {
    console.log('Server listening on 3000.');
    var RestResource = require('../lib/rest-model');

    var rest = new RestResource('Users', 'http://localhost:3000');

    rest.query(function (err, body, response) {
        console.log(body);
    });

    rest.find(1, function (err, body, response) {
        console.log(err, response && response.statusCode);
        console.log(body);
    });

    rest.update(1, new User({name: 'Raymond'}), function (err, body, response) {
        console.log(err, response && response.statusCode);
    });

    rest.delete(1, function (err, body, response) {
        console.log(err, response && response.statusCode);
    });

    rest.create(new User({name: 'Mary'}), function (err, body, response) {
        console.log(response && response.statusCode);
        console.log(response && response.headers['location']);
        console.log(body);
    });

    rest.query(function (err, body, response) {
        console.log(body);
    });

    console.log('Press Ctrl+C to exit.');


});