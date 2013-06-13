Asteroid REST Connector
=======================

Why REST connector?
===================
REST APIs are the de facto standard to access cloud services as well as many enterprise systems. Being able to consume REST apis in a simple and flexible way is critical to Asteroid for mobile backend developers.

User experience with REST connector
===================================

As an Asteroid developer, I would like t use the REST connector to:

Bind a model to a REST resource that supports CRUD operations that follow REST conventions

* create: POST /users
* find: GET /users/:id
* delete: DELETE /users/:id
* update: PUT /users/:id
* query: GET /users?limit=5&username=ray&order=email

    var RestResource = require('../lib/rest');
    var users = new RestResource(User, 'http://localhost:3000');
    users.query(cb);
    users.find(1, cb);
    users.update(1, new User({name: 'Raymond'}), cb);
    users.delete(1, cb);
    users.create(new User({name: 'Mary'}), cb);

Invoke a REST/HTTP API using free-form or DSL
uri, method, query, headers, ...
* support json and/or xml
* support streaming
* support forms
* support advanced features
  * authentication: basic, digest, oauth 1 & 2
  * proxy
  * cache
  * retry
  * batching

    req.get('/')
    .header('Accept', 'application/json')
    .header('X-API-Key', 'foobar')
    .query({limit: 10, fields: 'name,id'}).
    .end(cb);


Define a spec for the REST API and map the operations to a list of methods
Templatize the HTTP request & response
Build a request from the method parameters
Extract the data of interest from the response (status code, body, headers, ...)

    // Build a REST API request using templates
    var req = builder.get('http://maps.googleapis.com/maps/api/geocode/{format=json}')
        .query({latlng: '{latitude},{longitude}', sensor: '{sensor=true}'});
 
    // Now we can invoke the REST API using an object that provide values to the templatized variables
    req.request({latitude: 40.714224, longitude: -73.961452, sensor: true}, processResponse);
 
    // The 2nd flavor is to construct a function from the request by
    // specifying an array of parameter names corresponding to the templatized variables
    var fn = req.operation(['latitude', 'longitude']);
    // Now we invoke the REST API as a method
    fn(40.714224, -73.961452, processResponse);

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


Map a query language to the REST resources
ql.io
    -- Define a mapping using create table
    create table google.geocode
    on select get from "http://maps.googleapis.com/maps/api/geocode/{format}?sensor=true&latlng={^latlng}"
    using defaults format = 'json'
    resultset 'results'
  
    -- Run the query to get formatted_address from the response
    select formatted_address from google.geocode where latlng='40.714224,-73.961452'

