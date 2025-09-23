// src/admin/updateUser.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { requireRole } from "../middleware/auth.js";

// Initialize DynamoDB once per container
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE;

export const handler = async (event) => {
  // ✅ Only HR can update users
  const authError = await requireRole(["HR"])(event);
  if (authError) return authError;

  const { userId } = event.pathParameters || {};
  const body = event.body ? JSON.parse(event.body) : {};

  if (!userId || Object.keys(body).length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing userId or update fields" }),
    };
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
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ConditionExpression: "attribute_exists(userId)", // ✅ ensure user exists
        ReturnValues: "ALL_NEW",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User updated successfully",
        user: result.Attributes,
      }),
    };
  } catch (err) {
    console.error("updateUser error", err);

    if (err.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message || "Internal error" }),
    };
  }
};
