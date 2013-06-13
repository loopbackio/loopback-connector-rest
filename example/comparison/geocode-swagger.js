var apiList =
{
    apiVersion: "1.0",
    swaggerVersion: "1.0",
    basePath: "http://maps.googleapis.com/maps/api/",

    apis: [
        {
            path: "/geocode/{format}",
            description: "Google Maps Geocode API"
        }
    ]
};


var geocodeApiSpec = {
    resourcePath: "/geocode",
    basePath: "http://maps.googleapis.com/maps/api/",
    apis: [
        {
            swaggerVersion: "1.0",
            apiVersion: "1.0",
            path: "geocode/{format}",
            description: "",
            operations: [
                {
                    parameters: [
                        {
                            name: "latlng",
                            description: "Latitude & Longitude (lat,lng)",
                            required: true,
                            dataType: "string",
                            paramType: "query"
                        },
                        {
                            name: "sensor",
                            description: "Sensor",
                            required: true,
                            dataType: "boolean",
                            paramType: "query"
                        }
                    ],
                    summary: "Geocode reverse lookup",
                    httpMethod: "GET",
                    errorResponses: [
                        {
                            reason: "Internal Error",
                            code: 500
                        }
                    ],
                    nickname: "geocode",
                    responseClass: "AddressComponents"
                }

            ],
            models: {
                AddressComponents: {
                    uniqueItems: false,
                    properties: {
                        formatted_address: {
                            uniqueItems: false,
                            type: "string",
                            required: false
                        },
                        status: {
                            uniqueItems: false,
                            type: "string",
                            required: false
                        }
                    }
                }
            }
        }
    ]
}

