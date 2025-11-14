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

async function getDoctorId(admin, user) {
  // 1. Try to find an existing doctor
  const { data: existingDoctors, error: findError } = await admin
    .from('doctors')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (findError) {
    // Log the error but don't throw, as we can try to create a doctor
    console.warn('Error finding doctor, will attempt to create one:', findError.message);
  }

  if (existingDoctors && existingDoctors.length > 0) {
    return existingDoctors[0].id;
  }

  // 2. If not found, create a new doctor entry
  console.log(`No doctor found for user ${user.id}. Attempting to create a new one.`);

  // Robustly determine the name, falling back to email
  const name = user.user_metadata?.name || user.email || `User ${user.id}`;

  const newDoctorPayload = {
    user_id: user.id,
    email: user.email,
    name: name,
  };

  const { data: createdDoctor, error: createError } = await admin
    .from('doctors')
    .insert(newDoctorPayload)
    .select('id')
    .single();

  if (createError) {
    console.error('Error creating doctor:', createError.message);
    // Provide a more specific error message if possible
    if (createError.message.includes('violates not-null constraint')) {
      throw new Error('Could not determine required fields (e.g., name) to create a doctor profile.');
    }
    throw new Error(`Failed to create doctor entry: ${createError.message}`);
  }

  if (!createdDoctor) {
    throw new Error('Failed to create doctor entry and could not retrieve the new ID.');
  }

  console.log(`Successfully created doctor with ID: ${createdDoctor.id} for user: ${user.id}`);
  return createdDoctor.id;
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

      // Step 1: Create the user in Supabase Auth
      const { data: authData, error: authError } = await anon.auth.signUp({
        email,
        password,
        options: {
          // Pass the name in the user_metadata
          data: { name: name || email },
        },
      });

      if (authError) {
        return json(400, { error: `Authentication failed: ${authError.message}` });
      }

      const user = authData.user;
      if (!user) {
        return json(500, { error: 'Signup succeeded but user object was not returned.' });
      }

      // Step 2: Manually insert the user profile into the public.users table
      const { error: profileError } = await admin.from('users').insert({
        id: user.id, // Link to the auth.users table
        email: user.email,
        name: name || user.email, // Use provided name or fallback to email
        role: 'patient', // Assign a valid default role
      });

      if (profileError) {
        // If profile creation fails, we must delete the auth user to avoid inconsistency.
        console.error('CRITICAL: Auth user created but profile insertion failed:', profileError.message);
        await admin.auth.admin.deleteUser(user.id);
        return json(500, { error: `Failed to create user profile: ${profileError.message}` });
      }

      // Step 3: Return the session to the client
      return json(200, {
        access_token: authData.session?.access_token || null,
        refresh_token: authData.session?.refresh_token || null,
        user: user,
      });
    }

    // SIGNOUT
    if (path.endsWith('/api/signout')) {
      if (event.httpMethod !== 'POST') return methodNotAllowed();
      const token = parseAuth(event);
      if (token) {
        // Use the admin client to sign out the user by their token
        const { error } = await admin.auth.admin.signOut(token);
        if (error) {
          console.warn('Signout error:', error.message);
          // Don't block the client from signing out, just log the server-side error.
        }
      }
      return json(200, { message: 'Signed out successfully' });
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

    // LIST APPOINTMENTS (protected)
    if (path.endsWith('/api/appointments')) {
      if (event.httpMethod !== 'GET') return methodNotAllowed();
      const user = await requireAuth(event);
      const doctorId = await getDoctorId(admin, user); // Pass the full user object

      let query = admin
        .from('appointments')
        .select('*, patients(name, email, phone)') // Optimized Query
        .eq('doctor_id', doctorId)
        .is('deleted_at', null)
        .order('date_time', { ascending: true });

      const params = event.queryStringParameters || {};

      // Filtering
      if (params.date) {
        const startTime = `${params.date}T00:00:00Z`;
        const endTime = new Date(new Date(params.date).getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        query = query.gte('date_time', startTime).lt('date_time', `${endTime}T00:00:00Z`);
      } else {
        if (params.start_date) query = query.gte('date_time', new Date(params.start_date).toISOString());
        if (params.end_date) {
            const endDate = new Date(new Date(params.end_date).getTime() + 24 * 60 * 60 * 1000);
            query = query.lt('date_time', endDate.toISOString());
        }
      }
      if (params.status) query = query.eq('status', params.status);
      if (params.patient_id) query = query.eq('patient_id', params.patient_id);

      // Pagination
      const page = parseInt(params.page || '1', 10);
      const limit = parseInt(params.limit || '50', 10);
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: appointments, error } = await query;
      if (error) return json(500, { error: `Error fetching appointments: ${error.message}` });

      // Map the results to the desired format
      const enrichedAppointments = (appointments || []).map((apt) => {
        const patient = apt.patients; // Joined data from Supabase
        const aptDateTime = new Date(apt.date_time);
        return {
          id: apt.id,
          patient_id: apt.patient_id,
          patient_name: patient ? patient.name : '',
          patient_email: patient ? patient.email : '',
          patient_phone: patient ? patient.phone : '',
          date: aptDateTime.toISOString().split('T')[0],
          time: aptDateTime.toISOString().split('T')[1].substring(0, 5),
          duration: apt.duration,
          treatment: apt.type,
          status: apt.status,
          notes: apt.notes,
          is_first_visit: apt.is_first_visit,
          created_at: apt.created_at,
          updated_at: apt.updated_at,
        };
      });

      return json(200, {
        data: enrichedAppointments,
        success: true,
        message: 'Appointments retrieved successfully',
      });
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