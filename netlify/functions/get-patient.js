# filepath: netlify/functions/get-patient.js
const { createAdminClient, getUserFromToken } = require('./_supabase');

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };
    const id = event.queryStringParameters?.id;
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'missing id' }) };

    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    const cookieHeader = event.headers?.cookie || '';
    const cookieMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = authHeader || (cookieMatch ? cookieMatch[1] : null);

    const { user, error: userErr } = await getUserFromToken(token || '');
    if (userErr || !user) return { statusCode: 401, body: JSON.stringify({ error: 'unauthenticated' }) };

    const admin = createAdminClient();
    const { data, error } = await admin.from('patients').select('*').eq('id', id).limit(1).maybeSingle();
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message || error }) };
    if (!data) return { statusCode: 404, body: JSON.stringify({ error: 'not found' }) };

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) { return { statusCode: 500, body: JSON.stringify({ error: String(err) }) }; }
};
