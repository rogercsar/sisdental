// ...existing code...
const { createAnonClient } = require('./_supabase');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    console.error('login: invalid JSON body', err);
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid JSON' }) };
  }

  const { email, password } = body;
  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'email and password required' }) };
  }

  let client;
  try {
    client = createAnonClient();
  } catch (err) {
    console.error('login: createAnonClient failed', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'server misconfiguration: missing SUPABASE_URL or SUPABASE_ANON_KEY',
        detail: String(err.message || err)
      })
    };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('login: supabase auth error', error);
      return { statusCode: 401, body: JSON.stringify({ error: error.message || error }) };
    }
    return { statusCode: 200, body: JSON.stringify({ session: data.session, user: data.user }) };
  } catch (err) {
    console.error('login: unexpected error', err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
// ...existing code...