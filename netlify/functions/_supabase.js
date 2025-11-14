# filepath: netlify/functions/_supabase.js
const { createClient } = require('@supabase/supabase-js');

function getEnv(name, fallback = '') { return process.env[name] || fallback; }

function createAdminClient() {
  const url = getEnv('SUPABASE_URL');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY for admin client');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function createAnonClient() {
  const url = getEnv('SUPABASE_URL');
  const anonKey = getEnv('SUPABASE_ANON_KEY');
  if (!url || !anonKey) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY for anon client');
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getUserFromToken(token) {
  if (!token) return { user: null, error: 'no token' };
  const raw = typeof token === 'string' && token.startsWith('Bearer ') ? token.split(' ')[1] : token;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.getUser(raw);
    if (error) return { user: null, error };
    return { user: data?.user ?? null, error: null };
  } catch (err) { return { user: null, error: err }; }
}

module.exports = { createAdminClient, createAnonClient, getUserFromToken };
