console.log('Loading LoopbackConnector');

var LoopbackConnector = module.exports =

    function (table, statement, type, bag, path) {
        console.log('Exporting LoopbackConnector: ', table, statement, type, bag, path);

        this.exec = function (args) {
            console.log('Executing LoopbackConnector: ', args);
            return args.callback(null, {headers: {}, body: {results: [{formatted_address: '123 Street'}]}});
        }
    };

LoopbackConnector.connectorName = 'loopback';


