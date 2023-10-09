const { DynamoDB } = require('aws-sdk');
const dynamoDb = new DynamoDB.DocumentClient();

module.exports.employeeExperience = async function(event){
    console.log('Request Event:', event);
    let response;
    switch(true){
        case event.httpMethod === 'GETALL':
            response = await getAllEmployeesExperienceInfo();
            console.log(response);
            break;
        case event.httpMethod === 'GET':
            response = await getEmployeeExperienceInfo();
            console.log(response);
            break;
        case event.httpMethod === 'POST':
            response = await saveExperienceInfo();
            console.log(response);
            break;
        case event.httpMethod === 'PUT':
            response = await updateExperienceInfo();
            console.log(response);
            break;
        default:
            response = buildResponse(404, '404 Not Found'); 
    }
    return response;


}