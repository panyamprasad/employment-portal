const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

function validateEmail(email) {
  return email.includes("@");
}

module.exports.signInEmployee = async (event) => {
  try {
    const requestBody = JSON.parse(event.body);
    if (!requestBody.email || !requestBody.password) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid credentials...!",
        }),
      };
    }

    const params = {
      TableName: process.env.EMPLOYEE_TABLE,
      Item: {
        email: requestBody.email,
      },
    };
    const result = await dynamoDB.get(params).promise();

    if (!result.Item || result.Item.email !== requestBody.email) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized" }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Employee signed in successfully" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
