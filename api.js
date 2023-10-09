const { DynamoDB } = require("aws-sdk");
const dynamoDb = new DynamoDB.DocumentClient();

const getAllEmployeesExperienceInfoPath = "getAllEmployeesExperienceInfo";
const saveExperienceInfoPath = "saveExperienceInfo";

module.exports.employeeExperience = async function (event) {
  console.log("Request Event:", event);

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
    default:
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Method not allowed" }),
      };
  }

  //Save Record
  async function saveExperienceInfo(event) {
    try{
        const requestBody = JSON.parse(event.body);

        if (!requestBody) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid Data' }),
            };
        }
        const params = {
            TableName: process.env.EMPLOYEE_TABLE,
            Item: requestBody,
          };
        await dynamoDb.put(params).promise();
        return{
            statusCode: 200,
            body: JSON.stringify({
                message: 'Experience info added successfully...!'
            })
        } 
    }catch(error){
        return{
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal Server Error...!'
            })
        }
    }
  }

  //Get Record
  async function getEmployeeExperienceInfo() {
    const params = {
      TableName: process.env.EMPLOYEE_TABLE,
    };
    const allEmployeeExpInfo = await scanDynamoRecords(params, []);
    const body = {
      data: allEmployeeExpInfo,
    };
    return buildResponse(200, body);
  }

  //Get All Records
  async function getAllEmployeesExperienceInfo(employeeId) {
    const params = {
      TableName: process.env.EMPLOYEE_TABLE,
      Key: {
        employeeId: employeeId,
      },
    };
    return await dynamoDb
      .get(params)
      .promise()
      .then(
        (response) => {
          return buildResponse(200, response.Item);
        },
        (error) => {
          console.log("Get Experience error:", error);
        }
      );
  }

  
};
