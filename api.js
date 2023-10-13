const { DynamoDB } = require("aws-sdk");
const dynamoDb = new DynamoDB.DocumentClient();

module.exports.employeeExperience = async function (event) {
  // let response;
  // switch(true){
  //     case event.httpMethod === 'GET' && event.path === getAllEmployeesExperienceInfoPath:
  //         response = await getAllEmployeesExperienceInfo();
  //         console.log(response);
  //         break;
  //     case event.httpMethod === 'GET':
  //         response = await getEmployeeExperienceInfo(event.queryStringParameters.employeeId);
  //         console.log(response);
  //         break;
  //     case event.httpMethod === 'POST' && event.path === saveExperienceInfoPath:
  //         response = await saveExperienceInfo(JSON.parse(event.body));
  //         console.log(response);
  //         break;
  //     case event.httpMethod === 'PUT':
  //         response = await updateExperienceInfo(event.queryStringParameters.employeeId);
  //         console.log(response);
  //         break;
  //     default:
  //         return response
  // }
  // return response;
  const httpMethod = event.httpMethod;
  switch (httpMethod) {
    case "POST":
      return saveExperienceInfo(event);
    case "PUT":
      return updateExperience(event);
    case "GET":
      if (event.pathParameters && event.pathParameters.employeeId) {
        return getEmployeeExperience(event);
      } else {
        return getAllEmployeesExperience(event);
      }
    case "DELETE":
      if (event.pathParameters && event.pathParameters.employeeId) {
        if (event.resource === "/deleteExperienceInfo/{employeeId}") {
          return hardDeleteEmployeeExperience(event);
        } else if (
          event.resource === "/softDeleteExperienceInfo/{employeeId}"
        ) {
          return softDeleteEmployeeExperience(event);
        }
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: "EmployeeId missing in delete request...!",
          }),
        };
      }
    default:
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Method not allowed" }),
      };
  }

  //Save Record
  async function saveExperienceInfo(event) {
    try {
      const requestBody = JSON.parse(event.body);

      // Validate StartDate and EndDate
      if (new Date(requestBody.startDate) >= new Date(requestBody.endDate)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "EndDate must be after StartDate" }),
        };
      }
      const params = {
        TableName: process.env.EMPLOYEE_TABLE,
        Item: requestBody,
      };
      await dynamoDb.put(params).promise();
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Experience info added successfully...!",
        }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Internal Server Error...!",
        }),
      };
    }
  }

  //Update Record
  async function updateExperience(event) {
    try {
      const employeeId = event.pathParameters.employeeId;
      const requestBody = JSON.parse(event.body);
      console.log(requestBody)
      const params = {
        TableName: process.env.EMPLOYEE_TABLE,
        Key: {
          empId: employeeId,
        },
        UpdateExpression:
          "SET Experience_Info.companyName = :companyName, Experience_Info.companyLocation = :companyLocation," +
          "Experience_Info.startDate = :startDate, Experience_Info.endDate = :endDate, Experience_Info.performedRole = :performedRole," + 
          "Experience_Info.responsibilities = :responsibilities, Experience_Info.technologiesWorked = :technologiesWorked," + 
          "Experience_Info.isActive = :isActive",
        ExpressionAttributeValues: {
          ":companyName": requestBody.Experience_Info.companyName,
          ":companyLocation": requestBody.Experience_Info.companyLocation,
          ":startDate": requestBody.Experience_Info.startDate,
          ":endDate": requestBody.Experience_Info.endDate,
          ":performedRole": requestBody.Experience_Info.performedRole,
          ":responsibilities": requestBody.Experience_Info.responsibilities,
          ":technologiesWorked": requestBody.Experience_Info.technologiesWorked,
          ":isActive": requestBody.Experience_Info.isActive,
        },
      };
      await dynamoDb.update(params).promise();
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Record Updated Successfully...!",
        }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: error.message,
        }),
      };
    }
  }

  //Get Record
  async function getEmployeeExperience(event) {
    try {
      const params = {
        TableName: process.env.EMPLOYEE_TABLE,
        Key: {
          empId: event.pathParameters.employeeId,
        },
      };
      const result = await dynamoDb.get(params).promise();
      if (!result.Item) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Record not found...!" }),
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify(result.Item),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: error.message,
        }),
      };
    }
  }

  //Get All Records
  async function getAllEmployeesExperience(event) {
    try {
      const params = {
        TableName: process.env.EMPLOYEE_TABLE,
      };
      const result = await dynamoDb.scan(params).promise();
      if (!result.Items || result.Items.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "No records found...!" }),
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify(result.Items),
      };
    } catch (error) {
      console.error("Error fetching all employees experience:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: error.message }),
      };
    }
  }

  //Delete Record
  async function hardDeleteEmployeeExperience(event) {
    try {
      const employeeId = event.pathParameters.employeeId;
      const params = {
        TableName: process.env.EMPLOYEE_TABLE,
        Key: {
          empId: employeeId,
        },
      };
      const result = await dynamoDb.delete(params).promise();
      if(!result.Item){
        return{
          statusCode: 400,
          body: JSON.stringify({ message: `${employeeId} record not found...!` }),
        }
      }
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `${employeeId} Record deleted successfully...!`,
        }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: error.message,
        }),
      };
    }
  }

  //Soft Delete Record
  async function softDeleteEmployeeExperience(event) {
    try {
      const employeeId = event.pathParameters.employeeId;
      const requestBody = JSON.parse(event.body);
      const params = {
        TableName: process.env.EMPLOYEE_TABLE,
        Key: {
          empId: employeeId,
        },
        UpdateExpression: "SET Experience_Info.IsActive = :isActive",
        ExpressionAttributeValues: {
          ":isActive": requestBody.Experience_Info.isActive,
        },
      };
      const result = await dynamoDb.update(params).promise();
      if(!result.Item){
        return{
          statusCode: 400,
          body: JSON.stringify({
            message: `${employeeId} is not available...`
          })
        }
      }
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Record soft deleted Successfully...!",
        }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: error.message,
        }),
      };
    }
  }
};
