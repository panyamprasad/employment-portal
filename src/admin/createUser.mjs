import { CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminSetUserPasswordCommand, AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from 'crypto';
import { requireRole } from '../middleware/auth.js';

const cognitoClient = new CognitoIdentityProviderClient({});
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event) => {
  // ✅ Check if caller is HR
  // const authResult = await requireRole(['HR'])(event);
  // if (authResult) return authResult;

  const body = event.body ? JSON.parse(event.body) : {};
  const { email, name, role } = body;

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
  let createdUsername;
  try {
    // 0) Check if user exist or not
    const exists = await userExistsInCognito(userPoolId, email);
    if(exists){
      return response(409, 'User already exist in cognito');
    }
    
    // 1) Create the user in Cognito (suppress automatic invitation email)
    const tempPass = generateSecurePassword();
    createdUsername = await createCognitoUser(userPoolId, email, tempPass, name);

    // 2) Set the password to permanent so the user can login
    await setCognitoPassword(userPoolId, createdUsername, tempPass)

    // 3) Add user to requested group (HR or EMPLOYEE)
    await cognitoClient.send(new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: createdUsername,
      GroupName: role
    }));

    // 4) Persist minimal user record to DynamoDB
    await saveUserToDB(usersTable, createdUsername, { email, name, role });
    // NOTE: returning the temporaryPassword in the response for admin onboarding convenience.
    // In production you should deliver credentials securely (email, inbound HR flow, etc.).
    return {
      statusCode: 201,
      body: JSON.stringify({ 
        userId: createdUsername, 
        email, 
        name, 
        role, 
        temporaryPassword: tempPass 
      })
    };
  } catch (err) {
    console.error('adminCreateUser error', err);

    if(createdUsername){
      await safeDeleteCognitoUser(userPoolId, createdUsername);
    }
    if (err.name === 'ConditionalCheckFailedException') {
      return response(409, 'User already exists in database')
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message || 'Internal error' })
    };
  }
};

const response = (statusCode, message) => ({
  statusCode,
  body: JSON.stringify({ message })
});

async function userExistsInCognito(userPoolId, email) {
  try{
      await cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: email
      }));
      return true;
    }catch(err){
        if (err.name !== 'UserNotFoundException') throw err;
    }
}

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

async function createCognitoUser(userPoolId, email, tempPass, name) {
  const res = await cognitoClient.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name },
        { Name: 'email_verified', Value: 'true' }
      ],
      MessageAction: 'SUPPRESS',
      TemporaryPassword: tempPass
  }));
  return res?.User?.Username || email;
}

async function setCognitoPassword(userPoolId, createdUsername, tempPass) {
  return await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: createdUsername,
      Password: tempPass,
      Permanent: true
  }));
}

async function saveUserToDB(TableName, userId, {email, name, role}) {
  return await ddb.send(new PutCommand({
    TableName: TableName,
    Item:{
      userId, 
      email, 
      name, 
      role, 
      createdAt: new Date().toISOString()
    },
    ConditionExpression: 'attribute_not_exists(userId)'
  }));
}

async function safeDeleteCognitoUser(userPoolId, username) {
  try{
    await cognitoClient.send(new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: username
    }));
    console.log(`Rolled back user ${username} from Cognito`);
  }catch(delErr){
    console.error('Failed to rollback user from Cognito', delErr);
  }
}