// Live lookup against Wikipedia's own REST API (official, no key needed)
// rather than a bundled set of images — works for any aircraft type text
// typed freehand on a review (keyword-matched to the right article), and
// also backs the "favorite aircraft" picker list on Profile.
export const COMMON_AIRCRAFT = [
  { label: 'Boeing 737', keywords: ['737'], title: 'Boeing_737' },
  { label: 'Boeing 747', keywords: ['747'], title: 'Boeing_747' },
  { label: 'Boeing 757', keywords: ['757'], title: 'Boeing_757' },
  { label: 'Boeing 767', keywords: ['767'], title: 'Boeing_767' },
  { label: 'Boeing 777', keywords: ['777'], title: 'Boeing_777' },
  { label: 'Boeing 787 Dreamliner', keywords: ['787', 'dreamliner'], title: 'Boeing_787_Dreamliner' },
  { label: 'Airbus A220', keywords: ['a220'], title: 'Airbus_A220' },
  { label: 'Airbus A320', keywords: ['a320'], title: 'Airbus_A320' },
  { label: 'Airbus A321', keywords: ['a321'], title: 'Airbus_A321' },
  { label: 'Airbus A330', keywords: ['a330'], title: 'Airbus_A330' },
  { label: 'Airbus A350', keywords: ['a350'], title: 'Airbus_A350' },
  { label: 'Airbus A380', keywords: ['a380'], title: 'Airbus_A380' },
  { label: 'Embraer E-Jet', keywords: ['embraer', 'e-jet', 'erj'], title: 'Embraer_E-Jet_family' },
  { label: 'Bombardier CRJ', keywords: ['crj'], title: 'Bombardier_CRJ700_series' },
  { label: 'De Havilland Dash 8', keywords: ['dash 8', 'dhc-8', 'q400'], title: 'De_Havilland_Canada_Dash_8' },
  { label: 'ATR 72', keywords: ['atr'], title: 'ATR_72' },
];

function matchWikiTitle(aircraftType) {
  if (!aircraftType) return null;
  const normalized = aircraftType.toLowerCase();
  const match = COMMON_AIRCRAFT.find((entry) => entry.keywords.some((k) => normalized.includes(k)));
  return match?.title ?? null;
}

const cache = new Map();

export async function getAircraftPhotoUrl(aircraftType) {
  const title = matchWikiTitle(aircraftType);
  if (!title) return null;
  if (cache.has(title)) return cache.get(title);
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
    if (!res.ok) {
      cache.set(title, null);
      return null;
    }
    const data = await res.json();
    const url = data?.thumbnail?.source ?? null;
    cache.set(title, url);
    return url;
  } catch {
    return null;
  }
}
