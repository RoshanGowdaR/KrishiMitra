import { supabase } from '../lib/supabase';

// Search users by UID or name.
export const searchUsers = async (query) => {
  if (!query?.trim()) return [];

  const cleaned = query.trim();
  const isUidLike = /^[a-zA-Z0-9-]{6,}$/.test(cleaned);

  let builder = supabase
    .from('users')
    .select('id, user_uid, name, email, state, district, preferred_language, avatar_url')
    .limit(10);

  if (isUidLike) {
    builder = builder.or(`user_uid.ilike.%${cleaned}%,id::text.ilike.%${cleaned}%`);
  } else {
    builder = builder.or(`name.ilike.%${cleaned}%,district.ilike.%${cleaned}%,state.ilike.%${cleaned}%`);
  }

  const { data } = await builder;
  return data || [];
};

// Get user by ID.
export const getUserById = async (userId) => {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
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
  const { data } = await supabase
    .from('friend_requests')
    .select('*, sender:users!friend_requests_sender_id_fkey(id, name, state, district, avatar_url)')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return data || [];
};

// Get friends list.
export const getFriends = async (userId) => {
  const { data } = await supabase
    .from('friends')
    .select('*, friend:users!friends_user2_id_fkey(id, name, email, state, district, avatar_url)')
    .eq('user1_id', userId);
  return data || [];
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
export const getUnreadCounts = async (userId) => {
  const { data } = await supabase
    .from('messages')
    .select('sender_id')
    .eq('receiver_id', userId)
    .eq('is_read', false);

  const counts = {};
  data?.forEach((message) => {
    counts[message.sender_id] = (counts[message.sender_id] || 0) + 1;
  });
  return counts;
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
