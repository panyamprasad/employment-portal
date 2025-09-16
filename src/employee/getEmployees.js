import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const data = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const getEmployeesList = async() => {
    try{
        const result = await data.send( new ScanCommand({
            TableName: process.env.DYNAMODB_EMPLOYEE_TABLE,
        }))
        console.log('Result : ', result);

        if (!result.Count || result.Count === 0){
            return{
                statusCode: 404,
                body: JSON.stringify({ message: 'No Employees found'}),
            }
        }

        const emplyeeData = result.Items.map(({ primary_key, email}) => ({
            name: primary_key, 
            email,
        }))
        return{
            statusCode: 200,
            body: JSON.stringify({
                total: emplyeeData.Count,
                items,
            })
        }
    }catch(error){
        console.error('Error fetching employees:', error)
        return {
        statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to fetch employees',
                error: error.message,
            }),
        }
    }
}