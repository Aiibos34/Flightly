import AsyncStorage from '@react-native-async-storage/async-storage';

// Tracks which stories this device has already watched, so the story
// circle's ring can dim after viewing (matches the "gold ring = unwatched"
// convention from PLANNING.md). Persisted locally rather than in Firestore —
// this is purely a per-device UI affordance, not something worth a write
// for on every story view.
const KEY = 'flightly_viewed_stories';

export async function getViewedStoryIds() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export async function markStoryViewed(id) {
  if (!id) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const ids = raw ? JSON.parse(raw) : [];
    if (!ids.includes(id)) {
      ids.push(id);
      await AsyncStorage.setItem(KEY, JSON.stringify(ids));
    }
  } catch {
    // best-effort — worst case the ring just doesn't dim
  }
}
