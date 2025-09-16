import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

export const createEmployee = async (event) => {
  // Decode base64 body if coming from API Gateway
  try{
    const body = event.isBase64Encoded ? JSON.parse(Buffer.from(event.body, "base64").toString()): JSON.parse(event.body);

    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    const putParams = {
      TableName: process.env.DYNAMODB_EMPLOYEE_TABLE,
      Item: {
        primary_key: body.name,
        email: body.email,
      },
    };

    await ddb.send(new PutCommand(putParams));

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Employee created successfully" }),
    };
  }catch(error){
    console.error('Error add the employee:', error);
     return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to add the employee',
        error: error.message,
      }),
    }
  }
};
