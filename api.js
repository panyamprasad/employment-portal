const { DynamoDB } = require('aws-sdk');
const dynamoDb = new DynamoDB.DocumentClient();

const getAllEmployeesExperienceInfoPath = 'getAllEmployeesExperienceInfo';
const saveExperienceInfoPath = 'saveExperienceInfo';

module.exports.employeeExperience = async function(event) {
    console.log('Request Event:', event);

    let response;
    switch (true) {
        case event.httpMethod === 'GET' && event.resource === `/${getAllEmployeesExperienceInfoPath}`:
            response = await getAllEmployeesExperienceInfo(event.pathParameters.employeeId);
            console.log(response);
            break;
        case event.httpMethod === 'GET':
            response = await getEmployeeExperienceInfo(event.pathParameters.employeeId);
            console.log(response);
            break;
        case event.httpMethod === 'POST' && event.resource === `/${saveExperienceInfoPath}`:
            response = await saveExperienceInfo(JSON.parse(event.body));
            console.log(response);
            break;
        case event.httpMethod === 'PUT':
            response = await updateExperienceInfo(event.pathParameters.employeeId);
            console.log(response);
            break;
        default:
            return response;
    }
    return response;

    async function getEmployeeExperienceInfo(employeeId) {
        const params = {
            TableName: process.env.EMPLOYEE_TABLE,
            Key: {
                'EmpId': employeeId
            }
        };
        return await dynamoDb.get(params).promise().then((response) => {
            return buildResponse(200, response.Item);
        }).catch((error) => {
            console.log('Get Experience error:', error);
            return buildResponse(500, { error: 'Internal Server Error' });
        });
    }

    async function getAllEmployeesExperienceInfo(employeeId) {
        const params = {
            TableName: process.env.EMPLOYEE_TABLE
        };
        const allEmployeeExpInfo = await scanDynamoRecords(params, []);
        const body = {
            data: allEmployeeExpInfo
        };
        return buildResponse(200, body);
    }

    async function saveExperienceInfo(requestBody) {
        const params = {
            TableName: process.env.EMPLOYEE_TABLE,
            Item: requestBody
        };
        return await dynamoDb.put(params).promise().then(() => {
            const body = {
                Operation: 'SAVE',
                Message: 'Success',
                Data: requestBody
            };
            return buildResponse(200, body);
        }).catch((error) => {
            console.log('Something went wrong:', error);
            return buildResponse(500, { error: 'Internal Server Error' });
        });
    }

    async function updateExperienceInfo(employeeId) {
        // Implement your update logic here
        // You can use the same structure as in other functions
    }

    function buildResponse(statusCode, body) {
        return {
            statusCode,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify(body)
        };
    }

    async function scanDynamoRecords(params, items) {
        const result = await dynamoDb.scan(params).promise();
        items = items.concat(result.Items);

        if (result.LastEvaluatedKey) {
            params.ExclusiveStartKey = result.LastEvaluatedKey;
            return scanDynamoRecords(params, items);
        }

        return items;
    }
};
