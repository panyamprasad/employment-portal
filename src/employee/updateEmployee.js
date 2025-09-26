// src/employee/updateProfile.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getUserIdFromEvent } from "../middleware/auth.js";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EMPLOYEE_TABLE = process.env.DYNAMODB_EMPLOYEE_TABLE;

export const handler = async (event) => {
  const { userId, error } = await getUserIdFromEvent(event);
  if (error) return error;

  const body = event.body ? JSON.parse(event.body) : {};
  if (Object.keys(body).length === 0) {
    return { statusCode: 400, body: JSON.stringify({ message: "No update fields provided" }) };
  }

  try {
    // Build update expression dynamically
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};
    const setParts = [];

    let idx = 0;
    for (const [key, value] of Object.entries(body)) {
      idx++;
      const nameKey = `#f${idx}`;
      const valKey = `:v${idx}`;
      ExpressionAttributeNames[nameKey] = key;
      ExpressionAttributeValues[valKey] = value;
      setParts.push(`${nameKey} = ${valKey}`);
    }

    const updateExpression = "SET " + setParts.join(", ");

    const result = await ddb.send(
      new UpdateCommand({
        TableName: EMPLOYEE_TABLE,
        Key: { primary_key: userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Profile updated", profile: result.Attributes }),
    };
  } catch (err) {
    console.error("updateProfile error", err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
