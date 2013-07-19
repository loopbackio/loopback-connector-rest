# Loopback REST Connector

Loopback REST connector allows Node.js application to interact with HTTP REST APIs using a template driven approach.

# Features

Loopback REST connector supports three styles of API invocations:

1. Bind a model to a REST data source to supports CRUD operations that follow REST conventions

* create: POST /users
* findById: GET /users/:id
* delete: DELETE /users/:id
* update: PUT /users/:id
* find: GET /users?limit=5&username=ray&order=email

Sample code

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

    User.find(function (err, user) {
        console.log(user);
    });

    User.findById(1, function (err, user) {
        console.log(err, user);
    });

    User.upsert(new User({id: 1, name: 'Raymond'}), function (err, user) {
        console.log(err, user);
    });


    User.create(new User({name: 'Mary'}), function (err, user) {
        console.log(user);
    });


2. Define a custom method using REST template


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


