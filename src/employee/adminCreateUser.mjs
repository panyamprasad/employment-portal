import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from 'crypto';

const cognitoClient = new CognitoIdentityProviderClient({});
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { email, name, role, temporaryPassword } = body;

    if (!email || !name || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields: email, name, role' })
      };
    }

    const userPoolId = process.env.USER_POOL_ID;
    const usersTable = process.env.USERS_TABLE;

    if (!userPoolId || !usersTable) {
      throw new Error('Environment variables USER_POOL_ID or USERS_TABLE not set');
    }

    // Generate a secure temporary password if not provided
    const tempPass = temporaryPassword || generateSecurePassword();

    // 1) Create the user in Cognito (suppress automatic invitation email)
    const createUserCmd = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name },
        { Name: 'email_verified', Value: 'true' }
      ],
      MessageAction: 'SUPPRESS',
      TemporaryPassword: tempPass
    });

    const createResp = await cognitoClient.send(createUserCmd);
    const createdUsername = createResp?.User?.Username || email;

    // 2) Immediately set the password to permanent so the user can login
    const setPwdCmd = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: createdUsername,
      Password: tempPass,
      Permanent: true
    });
    await cognitoClient.send(setPwdCmd);

    // 3) Add user to requested group (HR or EMPLOYEE)
    const addToGroupCmd = new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: createdUsername,
      GroupName: role
    });
    await cognitoClient.send(addToGroupCmd);

    // 4) Persist minimal user record to DynamoDB
    const putCmd = new PutCommand({
      TableName: usersTable,
      Item: {
        userId: createdUsername,
        email,
        name,
        role,
        createdAt: new Date().toISOString()
      }
    });
    await ddb.send(putCmd);

    // NOTE: returning the temporaryPassword in the response for admin onboarding convenience.
    // In production you should deliver credentials securely (email, inbound HR flow, etc.).
    return {
      statusCode: 201,
      body: JSON.stringify({ userId: createdUsername, email, name, role, temporaryPassword: tempPass })
    };
  } catch (err) {
    console.error('adminCreateUser error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message || 'Internal error' })
    };
  }
};

function generateSecurePassword() {
  // Produces a Cognito-compatible password: mixed chars, 12 length
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{}<>?';
  const all = upper + lower + digits + symbols;

  const pick = (pool) => pool[Math.floor(crypto.randomInt(0, pool.length))];
  let pw = '';
  pw += pick(upper);
  pw += pick(lower);
  pw += pick(digits);
  pw += pick(symbols);
  for (let i = 4; i < 12; i++) pw += pick(all);
  return pw.split('').sort(() => 0.5 - Math.random()).join('');
}