var loopback = require("loopback");
var app = loopback();

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
// expose a rest api
    app.use(loopback.rest());
});

var ds = loopback.createDataSource({
    connector: require("../index"),
    debug: false,
    baseURL: 'http://localhost:3000'
});

var User = ds.createModel('User', {
    name: String,
    bio: String,
    approved: Boolean,
    joinedAt: Date,
    age: Number
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
    if (!body.id) {
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

    User.find(function (err, user) {
        console.log(user);
    });

    User.findById(1, function (err, user) {
        console.log(err, user);
    });

    User.upsert(new User({id: 1, name: 'Raymond'}), function (err, user) {
        console.log(err, user);
    });

    User.findById(1, function (err, user) {
        console.log(err, user);
        if (!err) {
            user.delete(function (err, user) {
                console.log(err, user);
            });
        }

    });

    /*
     User.delete(1, function (err, user) {
     console.log(err, user);
     });
     */

    User.create(new User({name: 'Mary'}), function (err, user) {
        console.log(user);
    });

    User.find(function (err, user) {
        console.log(user);
    });

    console.log('Press Ctrl+C to exit.');


});


