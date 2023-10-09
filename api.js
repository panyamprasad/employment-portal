const { DynamoDB } = require('aws-sdk');
const dynamoDb = new DynamoDB.DocumentClient();

module.exports.employeeExperience = async function(event){
    console.log('Request Event:', event);
    let response;
    switch(true){
        case event.httpMethod === 'GET':
            response = await getAllEmployeesExperienceInfo();
            console.log(response);
            break;
        case event.httpMethod === 'GET':
            response = await getEmployeeExperienceInfo(event.queryStringParameters.employeeId);
            console.log(response);
            break;
        case event.httpMethod === 'POST':
            response = await saveExperienceInfo();
            console.log(response);
            break;
        case event.httpMethod === 'PUT':
            response = await updateExperienceInfo(event.queryStringParameters.employeeId);
            console.log(response);
            break;
        default:
            return
    }
    return response;

    async function getEmployeeExperienceInfo(){
        const params = {
            TableName: process.env.EMPLOYEE_TABLE
        }
        const allEmployeeExpInfo = await scanDynamoRecords(params, []);
        const body = {
            data : allEmployeeExpInfo
        }
        return buildResponse(200, body)
    }

    async function getAllEmployeesExperienceInfo(employeeId){
        const params = {
            TableName: process.env.EMPLOYEE_TABLE,
            Key: {
                'employeeId': employeeId
            }
        }
        return await dynamoDb.get(params).promise().then((response) => {
            return buildResponse(200, response.item);
        }, (error) => {
            console.log('Get Experience error:', error);
        });
    }

    async function saveExperienceInfo(requestBody){
        const params = {
            TableName: process.env.EMPLOYEE_TABLE,
            item: requestBody
        }
        return await dynamoDb.put(params).promise().then(() =>{
            const body = {
                Operation: 'SAVE',
                Message: 'Success',
                Data: requestBody
            }
            return buildResponse(200, body);
        }, (error)=>{
            console.log('Something went wrong:', error)
        })
    }

}