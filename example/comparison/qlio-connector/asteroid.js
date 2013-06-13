console.log('Loading AsteroidConnector');

var AsteroidConnector = module.exports =

    function (table, statement, type, bag, path) {
        console.log('Exporting AsteroidConnector: ', table, statement, type, bag, path);

        this.exec = function (args) {
            console.log('Executing AsteroidConnector: ', args);
            return args.callback(null, {headers: {}, body: {results: [{formatted_address: '123 Street'}]}});
        }
    };

AsteroidConnector.connectorName = 'asteroid';


