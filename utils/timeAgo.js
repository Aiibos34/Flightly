export function timeAgo(timestamp) {
  if (!timestamp?.toMillis) return 'just now';
  const ms = Date.now() - timestamp.toMillis();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
