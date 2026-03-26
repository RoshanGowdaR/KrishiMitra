import { supabase } from '../lib/supabase';

const CHAT_PREFS_KEY = 'krishimitra_chat_prefs_v1';
const CHAT_REPORTS_KEY = 'krishimitra_chat_reports_v1';

const getConversationKey = (userId, friendId) => {
  const pair = [String(userId || ''), String(friendId || '')].sort();
  return `${pair[0]}__${pair[1]}`;
};

const readChatPrefsStore = () => {
  try {
    return JSON.parse(localStorage.getItem(CHAT_PREFS_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeChatPrefsStore = (payload) => {
  localStorage.setItem(CHAT_PREFS_KEY, JSON.stringify(payload));
};

const buildDerivedUid = (id) => {
  const normalized = String(id || '').replace(/-/g, '').toUpperCase();
  if (!normalized) return '';
  return `KM${normalized.slice(0, 10)}`;
};

const normalizeUser = (row = {}) => {
  const displayName = row.name || row.full_name || row.username || (row.email ? String(row.email).split('@')[0] : '') || 'Farmer';
  return {
    ...row,
    name: displayName,
    user_uid: row.user_uid || row.user_id || row.uid || buildDerivedUid(row.id) || '',
  };
};

// Search users by UID or name.
export const searchUsers = async (query) => {
  if (!query?.trim()) return [];

  const cleaned = query.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleaned);

  if (isUuid) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', cleaned)
      .limit(1);

    if (error) {
      console.error('searchUsers failed:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      ...normalizeUser(row),
    }));
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(500);

  if (error) {
    console.error('searchUsers failed:', error.message);
    return [];
  }

  const needle = cleaned.toLowerCase();
  const needleNoKm = needle.startsWith('km') ? needle.slice(2) : needle;
  const filtered = (data || []).filter((row) => {
    const idText = (row.id || '').toString();
    const idRaw = idText.replace(/-/g, '').toLowerCase();
    const idShort = idRaw.slice(0, 10);
    const uid = (row.user_uid || row.user_id || row.uid || '').toString().toLowerCase();
    const derivedUid = buildDerivedUid(row.id).toLowerCase();
    const name = (row.name || '').toString().toLowerCase();
    const district = (row.district || '').toString().toLowerCase();
    const state = (row.state || '').toString().toLowerCase();
    const email = (row.email || '').toString().toLowerCase();

    return (
      uid.includes(needle) ||
      uid.includes(needleNoKm) ||
      derivedUid.includes(needle) ||
      derivedUid.includes(needleNoKm) ||
      idText.toLowerCase().includes(needle) ||
      idRaw.includes(needleNoKm) ||
      idShort.includes(needleNoKm) ||
      name.includes(needle) ||
      district.includes(needle) ||
      state.includes(needle) ||
      email.includes(needle)
    );
  });

  return filtered.slice(0, 10).map((row) => ({
    ...normalizeUser(row),
  }));
};

// Get user by ID.
export const getUserById = async (userId) => {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  return data ? normalizeUser(data) : null;
};

// Send friend request.
export const sendFriendRequest = async (senderId, receiverId) => {
  const { data, error } = await supabase
    .from('friend_requests')
    .insert({ sender_id: senderId, receiver_id: receiverId });
  return { data, error };
};

// Accept friend request.
export const acceptFriendRequest = async (requestId, user1Id, user2Id) => {
  await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  await supabase.from('friends').insert([
    { user1_id: user1Id, user2_id: user2Id },
    { user1_id: user2Id, user2_id: user1Id },
  ]);
};

// Decline friend request.
export const declineFriendRequest = async (requestId) => {
  await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);
};

// Get friend requests for user (incoming).
export const getFriendRequests = async (userId) => {
  const { data: requests, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status, created_at')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getFriendRequests failed:', error.message);
    return [];
  }

  if (!requests?.length) return [];

  const senderIds = [...new Set(requests.map((row) => row.sender_id).filter(Boolean))];
  const { data: senders } = await supabase
    .from('users')
    .select('*')
    .in('id', senderIds);

  const senderMap = {};
  (senders || []).forEach((sender) => {
    senderMap[sender.id] = normalizeUser(sender);
  });

  return requests.map((row) => ({
    ...row,
    sender: senderMap[row.sender_id] || null,
  }));
};

// Get friends list.
export const getFriends = async (userId) => {
  const { data: rows, error } = await supabase
    .from('friends')
    .select('id, user1_id, user2_id, created_at')
    .eq('user1_id', userId);

  if (error) {
    console.error('getFriends failed:', error.message);
    return [];
  }

  if (!rows?.length) return [];

  const friendIds = [...new Set(rows.map((row) => row.user2_id).filter(Boolean))];
  const { data: friendsData } = await supabase
    .from('users')
    .select('*')
    .in('id', friendIds);

  const friendMap = {};
  (friendsData || []).forEach((friend) => {
    friendMap[friend.id] = normalizeUser(friend);
  });

  return rows.map((row) => ({
    ...row,
    friend: friendMap[row.user2_id] || null,
  }));
};

// Check friendship status and request metadata.
export const getFriendshipStatus = async (userId, targetId) => {
  const { data: friendship } = await supabase
    .from('friends')
    .select('id')
    .eq('user1_id', userId)
    .eq('user2_id', targetId)
    .maybeSingle();

  if (friendship) return { status: 'friends' };

  const { data: sentRequest } = await supabase
    .from('friend_requests')
    .select('id, status')
    .eq('sender_id', userId)
    .eq('receiver_id', targetId)
    .maybeSingle();

  if (sentRequest?.status === 'pending') {
    return { status: 'request_sent', requestId: sentRequest.id };
  }

  const { data: receivedRequest } = await supabase
    .from('friend_requests')
    .select('id, status')
    .eq('sender_id', targetId)
    .eq('receiver_id', userId)
    .maybeSingle();

  if (receivedRequest?.status === 'pending') {
    return { status: 'request_received', requestId: receivedRequest.id };
  }

  return { status: 'none' };
};

export const cancelFriendRequest = async (requestId) => {
  await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId);
};

// Remove friend.
export const removeFriend = async (userId, friendId) => {
  await supabase
    .from('friends')
    .delete()
    .or(`and(user1_id.eq.${userId},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${userId})`);
};

// Send message.
export const sendMessage = async (senderId, receiverId, content, mediaUrl = null, mediaType = null) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
    })
    .select()
    .single();
  return { data, error };
};

// Get conversation between two users.
export const getConversation = async (userId, friendId) => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),` +
      `and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
    )
    .order('created_at', { ascending: true });
  return data || [];
};

// Mark messages as read.
export const markMessagesRead = async (userId, senderId) => {
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('receiver_id', userId)
    .eq('sender_id', senderId)
    .eq('is_read', false);
};

// Get unread message count per friend.
export const getUnreadCounts = async (userId, options = {}) => {
  const { respectMute = false } = options;
  const { data } = await supabase
    .from('messages')
    .select('sender_id')
    .eq('receiver_id', userId)
    .eq('is_read', false);

  const counts = {};
  data?.forEach((message) => {
    if (respectMute) {
      const pref = getChatPreference(userId, message.sender_id);
      if (pref?.isMuted) return;
    }
    counts[message.sender_id] = (counts[message.sender_id] || 0) + 1;
  });
  return counts;
};

// Get aggregated unread message count.
export const getUnreadMessageTotal = async (userId) => {
  const counts = await getUnreadCounts(userId);
  return Object.values(counts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
};

// Get recent status updates for requests sent by current user.
export const getSentFriendRequestUpdates = async (userId) => {
  const { data: requests, error } = await supabase
    .from('friend_requests')
    .select('id, status, created_at, receiver_id')
    .eq('sender_id', userId)
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('getSentFriendRequestUpdates failed:', error.message);
    return [];
  }

  if (!requests?.length) return [];

  const receiverIds = [...new Set(requests.map((row) => row.receiver_id).filter(Boolean))];
  const { data: receivers } = await supabase
    .from('users')
    .select('*')
    .in('id', receiverIds);

  const receiverMap = {};
  (receivers || []).forEach((receiver) => {
    receiverMap[receiver.id] = normalizeUser(receiver);
  });

  return requests.map((row) => ({
    ...row,
    receiver: receiverMap[row.receiver_id] || null,
  }));
};

// Get global notification summary used for badges.
export const getNotificationSummary = async (userId) => {
  const [incomingRequests, unreadTotal] = await Promise.all([
    getFriendRequests(userId),
    getUnreadMessageTotal(userId),
  ]);

  return {
    pendingFriendRequests: incomingRequests.length,
    unreadMessages: unreadTotal,
    total: incomingRequests.length + unreadTotal,
  };
};

// Subscribe to new messages (realtime).
export const subscribeToMessages = (userId, callback) => {
  return supabase
    .channel(`messages-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `receiver_id=eq.${userId}`,
    }, callback)
    .subscribe();
};

// Subscribe to friend request inserts/updates relevant to the user.
export const subscribeToFriendRequestChanges = (userId, callback) => {
  return supabase
    .channel(`friend-requests-${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'friend_requests',
      filter: `receiver_id=eq.${userId}`,
    }, callback)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'friend_requests',
      filter: `sender_id=eq.${userId}`,
    }, callback)
    .subscribe();
};

// Upload image/video to Supabase storage.
export const uploadChatMedia = async (file, userId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}_${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from('chat-media')
    .upload(fileName, file);

  if (error) return { url: null, error };

  const { data: urlData } = supabase.storage
    .from('chat-media')
    .getPublicUrl(fileName);

  return { url: urlData.publicUrl, error: null };
};

export const clearConversationMessages = async (userId, friendId) => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),` +
      `and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
    );

  return { error };
};

export const getChatPreference = (userId, friendId) => {
  const store = readChatPrefsStore();
  const key = getConversationKey(userId, friendId);
  return store[key] || {
    isBlocked: false,
    isMuted: false,
    isFavorite: false,
    disappearingMode: 'off',
  };
};

export const setChatPreference = (userId, friendId, patch) => {
  const store = readChatPrefsStore();
  const key = getConversationKey(userId, friendId);
  const next = {
    isBlocked: false,
    isMuted: false,
    isFavorite: false,
    disappearingMode: 'off',
    ...(store[key] || {}),
    ...(patch || {}),
  };
  store[key] = next;
  writeChatPrefsStore(store);
  return next;
};

export const getAllChatPreferencesForUser = (userId, friendIds = []) => {
  const store = readChatPrefsStore();
  const result = {};

  friendIds.forEach((friendId) => {
    const key = getConversationKey(userId, friendId);
    result[friendId] = store[key] || {
      isBlocked: false,
      isMuted: false,
      isFavorite: false,
      disappearingMode: 'off',
    };
  });

  return result;
};

export const submitUserReport = async ({ reporterId, targetId, reason, details }) => {
  const payload = {
    reporter_uid: reporterId,
    target_uid: targetId,
    reason,
    details,
    status: 'open',
  };

  const { data, error } = await supabase.from('user_reports').insert(payload).select().maybeSingle();
  if (!error) {
    return { data, error: null };
  }

  try {
    const current = JSON.parse(localStorage.getItem(CHAT_REPORTS_KEY) || '[]');
    current.push({
      id: `${Date.now()}-${Math.random()}`,
      ...payload,
      created_at: new Date().toISOString(),
      source: 'local-fallback',
    });
    localStorage.setItem(CHAT_REPORTS_KEY, JSON.stringify(current));
    return { data: null, error: null };
  } catch {
    return { data: null, error };
  }
};
