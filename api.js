const { DynamoDB } = require('aws-sdk');
const dynamoDb = new DynamoDB.DocumentClient();

module.exports.employeePortal = async function(event){
    console.log('Request Event:', event);
    let response;
    // switch(true){
    //     case event.httpMethod === 'GET':
    // }
}