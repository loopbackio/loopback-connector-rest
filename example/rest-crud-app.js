var loopback = require('loopback');

// simplier way to describe model
var User = loopback.createModel('User', {
  name: String,
  bio: String,
  approved: Boolean,
  joinedAt: Date,
  age: Number
});

console.log(User.modelName);

var app = loopback();

app.set('port', process.env.PORT || 3000);
app.use(loopback.bodyParser.json({extended: false}));

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
  res.status(201).json(body);
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