var JsonTemplate = require('./../template');

var spec = require('./rest-spec.json');

function generateSwaggerSpec(spec, options) {
    var template = new JsonTemplate(spec);


    var schema = template.compile(true);
    console.log(schema);

    var op =
    {
        parameters: [],
        summary: template.template.doc || template.template.discription,
        httpMethod: template.template.method,
        errorResponses: [
            {
                reason: "Internal Error",
                code: 500
            }
        ],
        responseClass: ""
    };

    if (template.template.errors) {

    }

    for (var v in schema) {
        var root = schema[v].path[0];
        if ('body' === root) {
            continue;
        }
        var param = {
            name: v,

            required: schema[v].required,
            dataType: schema[v].type,
            paramType: root
        }
        var desc = schema[v].doc || schema[v].description;
        if (desc) {
            param.description = desc;
        }
        op.parameters.push(param);


    }

    console.log(op);
}
