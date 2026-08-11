import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';

// Static badge catalog, bundled like COMMON_AIRLINES/COMMON_AIRCRAFT rather
// than a Firestore `badges` collection — it's fixed app content, and using
// an Ionicons name instead of a hosted iconURL means zero Storage cost.
export const BADGES = [
  { key: 'first_flight', title: 'First Flight', description: 'Log your first flight review.', icon: 'airplane' },
  { key: 'frequent_flyer', title: 'Frequent Flyer', description: 'Log 10 flight reviews.', icon: 'repeat' },
  { key: 'jetsetter', title: 'Jetsetter', description: 'Log 25 flight reviews.', icon: 'earth' },
  { key: 'globe_trotter', title: 'Globe Trotter', description: 'Visit 10 different airports.', icon: 'navigate' },
  { key: 'airline_explorer', title: 'Airline Explorer', description: 'Fly with 5 different airlines.', icon: 'business' },
  { key: 'top_rated', title: 'Five Stars', description: 'Log a flight with a perfect 5.0 overall rating.', icon: 'star' },
  { key: 'wifi_warrior', title: 'Wifi Warrior', description: 'Log a flight with excellent wifi.', icon: 'wifi' },
  { key: 'cheers', title: 'Cheers', description: 'Log a flight with free alcohol.', icon: 'wine' },
  { key: 'recruiter', title: 'Recruiter', description: "Invite a friend who joins flightly.", icon: 'people' },
  { key: 'welcome_aboard', title: 'Welcome Aboard', description: "Join flightly through a friend's invite.", icon: 'gift' },
];

function computeStats(reviews) {
  const airports = new Set();
  const airlines = new Set();
  let hasTopRating = false;
  let hasGreatWifi = false;
  let hasFreeAlcohol = false;
  for (const r of reviews) {
    if (r.departureAirport) airports.add(r.departureAirport);
    if (r.arrivalAirport) airports.add(r.arrivalAirport);
    if (r.airline) airlines.add(r.airline);
    if (r.ratings?.overall >= 5) hasTopRating = true;
    if (r.wifiQuality === 'excellent') hasGreatWifi = true;
    if (r.freeAlcohol) hasFreeAlcohol = true;
  }
  return { flights: reviews.length, airports: airports.size, airlines: airlines.size, hasTopRating, hasGreatWifi, hasFreeAlcohol };
}

const CRITERIA = {
  first_flight: (s) => s.flights >= 1,
  frequent_flyer: (s) => s.flights >= 10,
  jetsetter: (s) => s.flights >= 25,
  globe_trotter: (s) => s.airports >= 10,
  airline_explorer: (s) => s.airlines >= 5,
  top_rated: (s) => s.hasTopRating,
  wifi_warrior: (s) => s.hasGreatWifi,
  cheers: (s) => s.hasFreeAlcohol,
};

export function earnedBadgeKeys(reviews) {
  const stats = computeStats(reviews);
  return BADGES.filter((b) => CRITERIA[b.key]?.(stats)).map((b) => b.key);
}

// Writes any newly-qualified badges to users/{uid}/badges/{badgeKey} (same
// subcollection-per-relationship pattern as followers/following) and
// returns just the ones newly unlocked by this call, for an unlock prompt.
// Idempotent — safe to call every time reviews load.
export async function syncEarnedBadges(userId, reviews) {
  if (!firebaseReady) return [];
  const earned = earnedBadgeKeys(reviews);
  if (earned.length === 0) return [];
  const existingSnap = await getDocs(collection(db, 'users', userId, 'badges'));
  const already = new Set(existingSnap.docs.map((d) => d.id));
  const newKeys = earned.filter((k) => !already.has(k));
  if (newKeys.length === 0) return [];
  await Promise.all(
    newKeys.map((key) =>
      setDoc(doc(db, 'users', userId, 'badges', key), {
        userId,
        badgeKey: key,
        earnedAt: serverTimestamp(),
        shared: false,
      })
    )
  );
  return BADGES.filter((b) => newKeys.includes(b.key));
}

// Awards a single badge directly rather than through the review-stat
// criteria above — for badges earned by an event (like a referral) instead
// of a computable stat. Idempotent: returns null if already earned.
export async function awardBadge(userId, key) {
  if (!firebaseReady) return null;
  const badge = BADGES.find((b) => b.key === key);
  if (!badge) return null;
  const ref = doc(db, 'users', userId, 'badges', key);
  const existing = await getDoc(ref);
  if (existing.exists()) return null;
  await setDoc(ref, { userId, badgeKey: key, earnedAt: serverTimestamp(), shared: false });
  return badge;
}
