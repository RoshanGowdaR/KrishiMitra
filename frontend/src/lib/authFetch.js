import { supabase } from './supabase';

const SESSION_EXPIRY_BUFFER_MS = 60_000;

const getFreshSession = async () => {
  const { data } = await supabase.auth.getSession();
  let session = data?.session ?? null;

  const expiresSoon = !!session?.expires_at && ((session.expires_at * 1000) - Date.now() <= SESSION_EXPIRY_BUFFER_MS);
  if (!session?.access_token || expiresSoon) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed?.session?.access_token) {
      throw new Error('Session expired. Please login again.');
    }
    session = refreshed.session;
  }

  return session;
};

const authHeaders = async (incomingHeaders = {}) => {
  const session = await getFreshSession();
  return {
    'Content-Type': 'application/json',
    ...incomingHeaders,
    Authorization: `Bearer ${session.access_token}`,
  };
};

export const authedFetch = async (url, options = {}) => {
  const requestOptions = { ...options };
  requestOptions.headers = await authHeaders(options.headers || {});

  let response = await fetch(url, requestOptions);
  if (response.status !== 401) {
    return response;
  }

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error || !refreshed?.session?.access_token) {
    await supabase.auth.signOut();
    throw new Error('Session expired. Please login again.');
  }

  requestOptions.headers = {
    ...requestOptions.headers,
    Authorization: `Bearer ${refreshed.session.access_token}`,
  };
  response = await fetch(url, requestOptions);

  if (response.status === 401) {
    await supabase.auth.signOut();
    throw new Error('Session expired. Please login again.');
  }

  return response;
};
