const { createClient } = require('@supabase/supabase-js');

function getEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function createAdminClient() {
  const url = getEnv('SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client');
  }
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createAnonClient() {
  const url = getEnv('SUPABASE_URL');
  const anonKey = getEnv('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY for anon client');
  }
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function getUserFromToken(token) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error) {
    throw new Error(error.message || 'Failed to get user from token');
  }
  return data.user;
}

module.exports = { createAdminClient, createAnonClient, getUserFromToken };