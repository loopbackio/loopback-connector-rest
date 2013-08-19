# LoopBack REST Connector

LoopBack REST connector allows Node.js application to interact with HTTP REST APIs using a template driven approach.
It supports two different styles of API invocations:

## Resource CRUD

If the REST APIs supports CRUD operations for resources, such as users or orders, you can simply bind the model to
a REST endpoint that follows REST conventions.

The following methods are mixed into your model class:

* create: POST /users
* findById: GET /users/:id
* delete: DELETE /users/:id
* update: PUT /users/:id
* find: GET /users?limit=5&username=ray&order=email

Below is a simple example:

    var ds = loopback.createDataSource({
        connector: require("loopback-connector-rest"),
        debug: false,
        baseURL: 'http://localhost:3000'
    });

    var User = ds.createModel('user', {
        name: String,
        bio: String,
        approved: Boolean,
        joinedAt: Date,
        age: Number
    });

    User.create(new User({name: 'Mary'}), function (err, user) {
        console.log(user);
    });

    User.find(function (err, user) {
        console.log(user);
    });

    User.findById(1, function (err, user) {
        console.log(err, user);
    });

    User.update(new User({id: 1, name: 'Raymond'}), function (err, user) {
        console.log(err, user);
    });


## Define a custom method using REST template

Imagine that you use browser or REST client to test drive a REST API, you will specify the following HTTP request properties:

* method: HTTP method
* url: The URL of the request
* headers: HTTP headers
* query: Query strings
* responsePath: JSONPath applied to the HTTP body

LoopBack REST connector allows you to define the API invocation as a json template. For example,

        template: {
                "method": "GET",
                "url": "http://maps.googleapis.com/maps/api/geocode/{format=json}",
                "headers": {
                    "accepts": "application/json",
                    "content-type": "application/json"
                },
                "query": {
                    "address": "{street},{city},{zipcode}",
                    "sensor": "{sensor=false}"
                },
                "responsePath": "$.results[0].geometry.location"
            }

The template variable syntax is as follows:

    {name=defaultValue:type}

The variable is required if the name has a prefix of ! or ^

For example:

    '{x=100:number}'
    '{x:number}'
    '{x}'
    '{x=100}ABC{y}123'
    '{!x}'
    '{x=100}ABC{^y}123'

To use custom methods, you can configure the REST connector with the `operations` property, which is an array of
objects that contain `template` and `functions`. The `template` property defines the API structure while the `functions`
property defines JavaScript methods that takes the list of parameter names.

    var loopback = require("loopback");

    var ds = loopback.createDataSource({
        connector: require("loopback-connector-rest"),
        debug: false,
        operations: [
        {
            template: {
                "method": "GET",
                "url": "http://maps.googleapis.com/maps/api/geocode/{format=json}",
                "headers": {
                    "accepts": "application/json",
                    "content-type": "application/json"
                },
                "query": {
                    "address": "{street},{city},{zipcode}",
                    "sensor": "{sensor=false}"
                },
                "responsePath": "$.results[0].geometry.location"
            },
            functions: {
               "geocode": ["street", "city", "zipcode"]
            }
        }
    ]});

Now you can invoke the geocode API as follows:

    Model.geocode('107 S B St', 'San Mateo', '94401', processResponse);

By default, LoopBack REST connector also provides an 'invoke' method to call the REST API with an object of parameters,
for example:

    Model.invoke({street: '107 S B St', city: 'San Mateo', zipcode: '94401'}, processResponse);




