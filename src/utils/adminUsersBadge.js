const USERS_SEEN_KEY = 'admin_users_last_seen_at';
export const ADMIN_USERS_SEEN_EVENT = 'admin_users_seen';

export function getUsersLastSeenAt() {
  return localStorage.getItem(USERS_SEEN_KEY) || '1970-01-01T00:00:00.000Z';
}

export function markUsersAsSeen() {
  localStorage.setItem(USERS_SEEN_KEY, new Date().toISOString());
  window.dispatchEvent(new Event(ADMIN_USERS_SEEN_EVENT));
}

export function countNewUsers(users, lastSeenAt = getUsersLastSeenAt()) {
  const seenTime = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seenTime)) return 0;
  return (users || []).filter((user) => {
    if (!user?.createdAt) return false;
    if (user.role === 'ADMIN') return false;
    return new Date(user.createdAt).getTime() > seenTime;
  }).length;
}
