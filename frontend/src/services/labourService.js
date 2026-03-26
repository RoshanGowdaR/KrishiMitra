import { supabase } from '../lib/supabase';

const ACTIVE_ACCEPTANCE_STATES = ['accepted', 'cancel_requested'];

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const isWithinMinutes = (isoText, minutes) => {
  const at = new Date(isoText).getTime();
  if (!Number.isFinite(at)) return false;
  return (Date.now() - at) <= (minutes * 60 * 1000);
};

const formatContactText = (user = {}) => {
  const phone = user.phone || 'Phone not added';
  const email = user.email || 'Email not added';
  return `Phone: ${phone}, Email: ${email}`;
};

const fetchUserMap = async (userIds = []) => {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return {};

  const { data } = await supabase
    .from('users')
    .select('*')
    .in('id', ids);

  const map = {};
  (data || []).forEach((row) => {
    map[row.id] = row;
  });
  return map;
};

const notifyUsers = async (rows = []) => {
  if (!rows.length) return;
  await supabase.from('notifications').insert(rows);
};

const countByRequest = (acceptances = []) => {
  const map = {};
  (acceptances || []).forEach((row) => {
    if (!ACTIVE_ACCEPTANCE_STATES.includes(String(row.status || '').toLowerCase())) return;
    map[row.request_id] = (map[row.request_id] || 0) + 1;
  });
  return map;
};

export const createLabourRequest = async ({
  requesterId,
  labourNeeded,
  payPerPerson,
  workDescription,
  hoursRequired,
  location = '',
}) => {
  const payload = {
    requester_id: requesterId,
    labour_needed: toNumber(labourNeeded, 1),
    pay_per_person: toNumber(payPerPerson, 0),
    work_description: String(workDescription || '').trim(),
    hours_required: toNumber(hoursRequired, 1),
    location: String(location || '').trim(),
    status: 'open',
  };

  const { data, error } = await supabase
    .from('labour_requests')
    .insert(payload)
    .select('*')
    .single();

  if (error) return { data: null, error };

  const [{ data: usersData }, { data: requester }] = await Promise.all([
    supabase.from('users').select('id'),
    supabase.from('users').select('*').eq('id', requesterId).single(),
  ]);

  const requesterName = requester?.name || requester?.full_name || requester?.email?.split('@')[0] || 'A farmer';

  const notifyRows = (usersData || [])
    .map((u) => u.id)
    .filter((id) => id && id !== requesterId)
    .map((userId) => ({
      user_id: userId,
      type: 'info',
      title: 'New Labour Request',
      message: `${requesterName} posted a labour request`,
      link: `/app/labour?requestId=${data.id}`,
      is_read: false,
    }));

  await notifyUsers(notifyRows);

  return { data, error: null };
};

export const fetchLabourDashboardData = async ({ userId }) => {
  const [{ data: requests, error: reqError }, { data: acceptances, error: accError }] = await Promise.all([
    supabase.from('labour_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('labour_acceptances').select('*').order('created_at', { ascending: false }),
  ]);

  if (reqError) return { error: reqError };
  if (accError) return { error: accError };

  const requesterIds = [...new Set((requests || []).map((r) => r.requester_id).filter(Boolean))];
  const labourIds = [...new Set((acceptances || []).map((a) => a.labour_user_id).filter(Boolean))];
  const userMap = await fetchUserMap([...requesterIds, ...labourIds]);

  const acceptedCounts = countByRequest(acceptances || []);

  const myAccepted = (acceptances || [])
    .filter((row) => row.labour_user_id === userId)
    .map((row) => ({
      ...row,
      request: (requests || []).find((r) => r.id === row.request_id) || null,
    }));

  const availableWork = (requests || []).filter((request) => {
    if (request.status !== 'open') return false;
    if (request.requester_id === userId) return false;

    const accepted = acceptedCounts[request.id] || 0;
    if (accepted >= toNumber(request.labour_needed, 0)) return false;

    const mine = (acceptances || []).find((a) => a.request_id === request.id && a.labour_user_id === userId);
    if (mine && ACTIVE_ACCEPTANCE_STATES.includes(String(mine.status || '').toLowerCase())) return false;

    return true;
  }).map((request) => ({
    ...request,
    requester: userMap[request.requester_id] || null,
    accepted_count: acceptedCounts[request.id] || 0,
  }));

  const myRequests = (requests || [])
    .filter((row) => row.requester_id === userId)
    .map((request) => {
      const accepts = (acceptances || []).filter((a) => a.request_id === request.id);
      return {
        ...request,
        accepted_count: acceptedCounts[request.id] || 0,
        acceptances: accepts.map((a) => ({ ...a, labour_user: userMap[a.labour_user_id] || null })),
      };
    });

  return {
    error: null,
    availableWork,
    myAccepted,
    myRequests,
    userMap,
  };
};

export const acceptLabourJob = async ({ requestId, labourUserId }) => {
  const { data: request, error: reqError } = await supabase
    .from('labour_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqError || !request) return { error: reqError || new Error('Request not found') };

  const { data: existing } = await supabase
    .from('labour_acceptances')
    .select('*')
    .eq('request_id', requestId)
    .eq('labour_user_id', labourUserId)
    .maybeSingle();

  if (existing && ACTIVE_ACCEPTANCE_STATES.includes(String(existing.status || '').toLowerCase())) {
    return { error: new Error('Already accepted this request') };
  }

  const { data: allAccepts } = await supabase
    .from('labour_acceptances')
    .select('*')
    .eq('request_id', requestId);

  const activeCount = (allAccepts || []).filter((row) => ACTIVE_ACCEPTANCE_STATES.includes(String(row.status || '').toLowerCase())).length;
  if (activeCount >= toNumber(request.labour_needed, 0)) {
    return { error: new Error('No slots left') };
  }

  let acceptanceRow = null;
  if (existing) {
    const { data, error } = await supabase
      .from('labour_acceptances')
      .update({ status: 'accepted', cancel_reason: null, cancel_requested_at: null, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) return { error };
    acceptanceRow = data;
  } else {
    const { data, error } = await supabase
      .from('labour_acceptances')
      .insert({ request_id: requestId, labour_user_id: labourUserId, status: 'accepted' })
      .select('*')
      .single();
    if (error) return { error };
    acceptanceRow = data;
  }

  const [{ data: labourUser }, { data: requesterUser }] = await Promise.all([
    supabase.from('users').select('*').eq('id', labourUserId).single(),
    supabase.from('users').select('*').eq('id', request.requester_id).single(),
  ]);

  const labourName = labourUser?.name || labourUser?.full_name || labourUser?.email?.split('@')[0] || 'A labour';
  await notifyUsers([
    {
      user_id: request.requester_id,
      type: 'success',
      title: 'Labour Request Accepted',
      message: `${labourName} accepted your labour request. ${formatContactText(labourUser)}`,
      link: `/app/profile/${labourUserId}`,
      is_read: false,
    },
  ]);

  const freshActiveCount = activeCount + 1;
  if (freshActiveCount >= toNumber(request.labour_needed, 0)) {
    await supabase.from('labour_requests').update({ status: 'filled' }).eq('id', requestId);
  }

  return { data: acceptanceRow, error: null, requesterUser };
};

export const cancelAcceptedLabourJob = async ({ acceptance, labourUserId, reason = '' }) => {
  if (!acceptance?.id) return { error: new Error('Acceptance not found') };

  const withinWindow = isWithinMinutes(acceptance.created_at, 30);
  if (withinWindow) {
    const { data, error } = await supabase
      .from('labour_acceptances')
      .update({ status: 'cancelled', cancel_reason: null, cancel_requested_at: null, updated_at: new Date().toISOString() })
      .eq('id', acceptance.id)
      .select('*')
      .single();
    if (error) return { error };

    await supabase.from('labour_requests').update({ status: 'open' }).eq('id', acceptance.request_id);
    return { data, error: null, mode: 'direct' };
  }

  if (!String(reason || '').trim()) {
    return { error: new Error('Reason is required for cancel request') };
  }

  const { data, error } = await supabase
    .from('labour_acceptances')
    .update({
      status: 'cancel_requested',
      cancel_reason: String(reason || '').trim(),
      cancel_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', acceptance.id)
    .select('*')
    .single();

  if (error) return { error };

  const [{ data: request }, { data: labourUser }] = await Promise.all([
    supabase.from('labour_requests').select('*').eq('id', acceptance.request_id).single(),
    supabase.from('users').select('*').eq('id', labourUserId).single(),
  ]);

  const labourName = labourUser?.name || labourUser?.full_name || labourUser?.email?.split('@')[0] || 'A labour';
  await notifyUsers([
    {
      user_id: request?.requester_id,
      type: 'warning',
      title: 'Labour Cancel Request',
      message: `${labourName} requested cancellation. Reason: ${String(reason || '').trim()}`,
      link: `/app/labour?requestId=${acceptance.request_id}`,
      is_read: false,
    },
  ]);

  return { data, error: null, mode: 'request' };
};

export const respondLabourCancelRequest = async ({ acceptanceId, approve, requesterId }) => {
  const { data: acceptance, error: fetchError } = await supabase
    .from('labour_acceptances')
    .select('*')
    .eq('id', acceptanceId)
    .single();

  if (fetchError || !acceptance) return { error: fetchError || new Error('Acceptance not found') };

  const nextStatus = approve ? 'cancelled' : 'accepted';
  const { data, error } = await supabase
    .from('labour_acceptances')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', acceptanceId)
    .select('*')
    .single();

  if (error) return { error };

  if (approve) {
    await supabase.from('labour_requests').update({ status: 'open' }).eq('id', acceptance.request_id);
  }

  await notifyUsers([
    {
      user_id: acceptance.labour_user_id,
      type: approve ? 'success' : 'info',
      title: approve ? 'Cancel Request Approved' : 'Cancel Request Rejected',
      message: approve
        ? 'Your labour job cancellation was approved by the requester.'
        : 'Your labour job cancellation was rejected by the requester.',
      link: '/app/labour',
      is_read: false,
    },
  ]);

  return { data, error: null };
};
