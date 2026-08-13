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

// Wikipedia's REST API can also throw sporadic 429s when a burst of lookups
// fires at once (e.g. the favorite-aircraft picker mounts all ~16 rows
// together) — a fixed inter-request delay alone didn't reliably avoid that
// in testing, but a retry after a failure did. So: a small gap between
// *distinct* lookups to avoid piling on, plus a couple of retries with
// backoff on any single lookup that still fails.
let queue = Promise.resolve();
const REQUEST_GAP_MS = 250;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 400;

function enqueue(task) {
  const run = queue.then(() => new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS)).then(task));
  // Swallow so one failed lookup doesn't stall the queue for everything after it.
  queue = run.catch(() => {});
  return run;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Wikimedia rejects requests with a generic/missing User-Agent (their
// documented policy: https://meta.wikimedia.org/wiki/User-Agent_policy) —
// confirmed via device logs as the real cause of the 403s, on *both* the API
// host and the image CDN host (upload.wikimedia.org). Setting this on our
// own fetch() calls works reliably; React Native's <Image> component's
// per-request headers option turned out not to (device logs showed the
// image CDN still 403ing even with the header set there) — a known rough
// edge in RN's native image loading, not something worth fighting further.
const WIKIPEDIA_HEADERS = {
  'User-Agent': 'flightly-app/1.0 (https://github.com/Aiibos34/Flightly)',
};

// Downloads the actual image bytes through our own working fetch() (rather
// than letting <Image> make its own separate native request) and hands back
// a data: URI — a local string, not a network request, so <Image> has
// nothing left to 403 on.
async function imageUrlToDataUri(imageUrl) {
  const res = await fetch(imageUrl, { headers: WIKIPEDIA_HEADERS });
  if (!res.ok) return null;
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('FileReader failed to read image blob'));
    reader.readAsDataURL(blob);
  });
}

async function fetchThumbnailDataUri(title) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
        headers: WIKIPEDIA_HEADERS,
      });
      if (res.ok) {
        const data = await res.json();
        const imageUrl = data?.thumbnail?.source ?? null;
        if (!imageUrl) return null; // confirmed: no thumbnail on this article
        const dataUri = await imageUrlToDataUri(imageUrl);
        if (dataUri) return dataUri;
        // image download failed — fall through and retry the whole lookup
      }
    } catch {
      // fall through to retry
    }
    if (attempt < MAX_ATTEMPTS) await wait(RETRY_BASE_MS * attempt);
  }
  return undefined; // undefined = every attempt failed, distinct from a confirmed "no thumbnail" null
}

export async function getAircraftPhotoUrl(aircraftType) {
  const title = matchWikiTitle(aircraftType);
  if (!title) return null;
  if (cache.has(title)) return cache.get(title);

  return enqueue(async () => {
    if (cache.has(title)) return cache.get(title);
    const dataUri = await fetchThumbnailDataUri(title);
    // Only cache a definite outcome — if every attempt failed, leave it
    // uncached so the next mount gets a fresh chance instead of a
    // permanently stuck "no photo".
    if (dataUri !== undefined) cache.set(title, dataUri);
    return dataUri ?? null;
  });
}
