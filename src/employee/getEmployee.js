// src/employee/getProfile.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getUserIdFromEvent } from "../middleware/auth.js";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EMPLOYEE_TABLE = process.env.DYNAMODB_EMPLOYEE_TABLE;

export const handler = async (event) => {
  const { userId, error } = await getUserIdFromEvent(event);
  if (error) return error;

  try {
    const result = await ddb.send(
      new GetCommand({
        TableName: EMPLOYEE_TABLE,
        Key: { primary_key: userId },
      })
    );

    if (!result.Item) {
      return { statusCode: 404, body: JSON.stringify({ message: "Profile not found" }) };
    }

    return { statusCode: 200, body: JSON.stringify(result.Item) };
  } catch (err) {
    console.error("getProfile error", err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
