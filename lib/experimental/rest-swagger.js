// Copyright IBM Corp. 2013,2019. All Rights Reserved.
// Node module: loopback-connector-rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const JsonTemplate = require('./../template');

const spec = require('./rest-spec.json');

function generateSwaggerSpec(spec, options) {
  const template = new JsonTemplate(spec);

  const schema = template.compile(true);
  console.log(schema);

  const op =
    {
      parameters: [],
      summary: template.template.doc || template.template.discription,
      httpMethod: template.template.method,
      errorResponses: [
        {
          reason: 'Internal Error',
          code: 500,
        },
      ],
      responseClass: '',
    };

  if (template.template.errors) {

  }

  for (const v in schema) {
    const root = schema[v].path[0];
    if ('body' === root) {
      continue;
    }
    const param = {
      name: v,

      required: schema[v].required,
      dataType: schema[v].type,
      paramType: root,
    };
    const desc = schema[v].doc || schema[v].description;
    if (desc) {
      param.description = desc;
    }
    op.parameters.push(param);
  }

  console.log(op);
}
