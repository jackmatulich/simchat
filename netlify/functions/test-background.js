if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }
  try {
    const convexUrl = process.env.CONVEX_URL;
    const convexAdminKey = process.env.CONVEX_ADMIN_KEY;
    console.log('Convex URL:', convexUrl);
    console.log('Convex Admin Key:', convexAdminKey ? '[REDACTED]' : 'NOT SET');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ convexUrl, convexAdminKey: convexAdminKey ? '[REDACTED]' : 'NOT SET' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
}; 