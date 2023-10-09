const { DynamoDB } = require('aws-sdk');
const dynamoDb = new DynamoDB.DocumentClient();

exports.handler = async function(event){
    console.log('Request Event:', event);
    let response;
    // switch(true){
    //     case event.httpMethod === 'GET':
    // }
}