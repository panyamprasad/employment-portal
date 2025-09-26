import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';

// Cache keys for performance
let cachedJwks = null;

const getJwks = async () => {
  if (cachedJwks) return cachedJwks;

  const region = process.env.AWS_REGION || 'us-east-1';
  const userPoolId = process.env.USER_POOL_ID;

  const url = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  const res = await fetch(url);
  cachedJwks = await res.json();
  return cachedJwks;
};

export const verifyToken = async (authHeader) => {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing token');
  const token = authHeader.split(' ')[1];

  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader) throw new Error('Invalid token');

  const jwks = await getJwks();
  const jwk = jwks.keys.find((k) => k.kid === decodedHeader.header.kid);
  if (!jwk) throw new Error('Invalid signing key');

  const pem = jwkToPem(jwk);

  return jwt.verify(token, pem, { algorithms: ['RS256'] });
};

export const requireRole = (allowedRoles = []) => {
  return async (event) => {
    try { 
        console.log("Auth header:", event.headers.Authorization || event.headers.authorization);
        const claims = await verifyToken(event.headers?.Authorization || event.headers?.authorization);
        console.log('Decode claims : ', claims); 
        const groups = claims['cognito:groups'] || [];
        const userRole = Array.isArray(groups) ? groups[0] : groups; // HR or EMPLOYEE

        if (!allowedRoles.includes(userRole)) {
            return {
            statusCode: 403,
            body: JSON.stringify({ message: 'Forbidden' }),
            };
      }

      // Attach user info for downstream logic
      event.user = {
        sub: claims.sub,
        email: claims.email,
        name: claims.name,
        role: userRole,
      };

      return null; // means allowed
    } catch (err) {
      console.error('Auth error', err);
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }
  };
};

export const getUserIdFromEvent = async (event) => {
  const jwtToken = event.headers?.authorization || event.headers.Authorization;
  if(!jwtToken){
    return{
      error: {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Misssing Token'
        })
      }
    }
  };
  const token = jwtToken.replace("Bearer ", "");
  const claims = await verifyToken(token);
  return {
    userId: claims.sub, claims
  };
};
