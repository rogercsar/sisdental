# filepath: netlify/functions/login.js
const { createAnonClient } = require('./_supabase');

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const body = event.body ? JSON.parse(event.body) : {};
    const { email, password } = body;
    if (!email || !password) return { statusCode: 400, body: JSON.stringify({ error: 'email and password required' }) };

    const client = createAnonClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { statusCode: 401, body: JSON.stringify({ error: error.message || error }) };

    return { statusCode: 200, body: JSON.stringify({ session: data.session, user: data.user }) };
  } catch (err) { return { statusCode: 500, body: JSON.stringify({ error: String(err) }) }; }
};
