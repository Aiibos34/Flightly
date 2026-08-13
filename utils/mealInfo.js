import { collection, getDocs } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';

// Crowd-sourced meal lookup: pulls from other users' past reviews that
// filled in a meal description, rather than a live catering API — none of
// the free-tier flight-data APIs cover meal contents, and a paid one isn't
// worth it for this. Data quality grows as more people log meals.
function normalize(text) {
  return (text || '').trim().toLowerCase();
}

function airlinesMatch(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export async function fetchMealReports(airline) {
  if (!firebaseReady || !airline) return [];
  const snap = await getDocs(collection(db, 'reviews'));
  return snap.docs
    .map((d) => d.data())
    .filter((r) => r.mealDescription && airlinesMatch(r.airline, airline))
    .map((r) => ({
      mealDescription: r.mealDescription,
      route: `${r.departureAirport} → ${r.arrivalAirport}`,
      username: r.username || 'pilot',
    }));
}
