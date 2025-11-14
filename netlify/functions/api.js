const { createAdminClient, createAnonClient, getUserFromToken } = require('./_supabase');

// Helper to parse auth and get user
async function requireAuth(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing bearer token');
  }
  const token = authHeader.substring('Bearer '.length);
  const user = await getUserFromToken(token);
  return user;
}

async function getDoctorId(admin, userId) {
  const { data, error } = await admin
    .from('doctors')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  if (error) throw new Error(error.message);
  return data && data.length > 0 ? data[0].id : null;
}

function json(status, data) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: JSON.stringify(data),
  };
}

function methodNotAllowed() {
  return json(405, { error: 'Method Not Allowed' });
}

function notFound() {
  return json(404, { error: 'Not Found' });
}

function parseAuth(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring('Bearer '.length);
}

// Optional proxy base to external Go backend
const PROXY_BASE = process.env.BACKEND_URL || process.env.API_URL || '';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  const path = event.path || '';
  const admin = createAdminClient();
  const anon = createAnonClient();

  try {
    // LOGIN
    if (path.endsWith('/api/login')) {
      if (event.httpMethod !== 'POST') return methodNotAllowed();
      const { email, password } = JSON.parse(event.body || '{}');
      const { data, error } = await anon.auth.signInWithPassword({ email, password });
      if (error) return json(401, { error: error.message });
      const { session, user } = data;
      return json(200, {
        access_token: session?.access_token,
        refresh_token: session?.refresh_token,
        user,
      });
    }

    // SIGNUP
    if (path.endsWith('/api/signup')) {
      if (event.httpMethod !== 'POST') return methodNotAllowed();
      const { email, password, name } = JSON.parse(event.body || '{}');
      const { data, error } = await anon.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) return json(400, { error: error.message });
      const { user, session } = data;
      let finalSession = session;
      if (!finalSession) {
        const { data: loginData, error: loginError } = await anon.auth.signInWithPassword({ email, password });
        if (!loginError) finalSession = loginData.session;
      }
      return json(200, {
        access_token: finalSession?.access_token || null,
        refresh_token: finalSession?.refresh_token || null,
        user,
      });
    }

    // ME (alias for /api/auth/me)
    if (path.endsWith('/api/me') || path.endsWith('/api/auth/me')) {
      if (event.httpMethod !== 'GET') return methodNotAllowed();
      const token = parseAuth(event);
      if (!token) return json(401, { error: 'Missing bearer token' });
      const user = await getUserFromToken(token);
      return json(200, { user });
    }

    // PATIENTS MY (protected)
    if (path.endsWith('/api/patients/my')) {
      if (event.httpMethod !== 'GET') return methodNotAllowed();
      const token = parseAuth(event);
      if (!token) return json(401, { error: 'Missing bearer token' });
      await getUserFromToken(token); // throws if invalid
      const { data, error } = await admin
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return json(500, { error: error.message });
      return json(200, { patients: data || [], user: null });
    }

    // CREATE PATIENT (protected)
    if (path.endsWith('/api/patients')) {
      if (event.httpMethod !== 'POST') return methodNotAllowed();
      const token = parseAuth(event);
      if (!token) return json(401, { error: 'Missing bearer token' });
      await getUserFromToken(token);
      const payload = JSON.parse(event.body || '{}');
      const { data, error } = await admin.from('patients').insert(payload).select('*').single();
      if (error) return json(400, { error: error.message });
      return json(200, { data, error: null });
    }

    // GET PATIENT BY ID (protected)
    if (path.match(/\/api\/patients\/[a-f0-9\-]{36}$/)) {
      if (event.httpMethod !== 'GET') return methodNotAllowed();
      const token = parseAuth(event);
      if (!token) return json(401, { error: 'Missing bearer token' });
      await getUserFromToken(token);
      const id = path.split('/').pop();
      const { data, error } = await admin.from('patients').select('*').eq('id', id).single();
      if (error) return json(404, { error: 'Patient not found' });
      return json(200, { data, error: null });
    }

    // Fallback: proxy to external backend if configured
    if (PROXY_BASE) {
      const query = event.rawQuery ? `?${event.rawQuery}` : '';
      const url = `${PROXY_BASE}${path}${query}`;
      let body = event.body;
      if (event.isBase64Encoded && body) {
        body = Buffer.from(body, 'base64').toString('utf8');
      }
      const headers = {
        Authorization: event.headers?.authorization || event.headers?.Authorization || undefined,
        'Content-Type': event.headers?.['content-type'] || 'application/json',
      };
      const resp = await fetch(url, {
        method: event.httpMethod,
        headers,
        body: ['GET', 'HEAD'].includes(event.httpMethod) ? undefined : body,
        redirect: 'manual',
      });
      const text = await resp.text();
      return {
        statusCode: resp.status,
        headers: {
          'Content-Type': resp.headers.get('content-type') || 'application/json',
          'Cache-Control': 'no-store',
        },
        body: text,
      };
    }

    return notFound();
  } catch (err) {
    return json(500, { error: err.message || 'Internal Server Error' });
  }
};