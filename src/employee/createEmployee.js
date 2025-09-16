import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

export const createEmployee = async (event) => {
  // Decode base64 body if coming from API Gateway
  const body = JSON.parse(Buffer.from(event.body, "base64").toString());

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
    body: JSON.stringify({ message: "Customer created successfully" }),
  };
};
