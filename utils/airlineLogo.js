// pics.avs.io is the public logo CDN behind the Aviasales/Travelpayouts flight
// widgets — no API key needed, hotlinkable directly by IATA code.
export function getAirlineLogoUrl(iataCode) {
  if (!iataCode) return null;
  return `https://pics.avs.io/200/200/${iataCode.toUpperCase()}.png`;
}

export const COMMON_AIRLINES = [
  { code: 'AA', name: 'American Airlines', country: 'United States' },
  { code: 'DL', name: 'Delta Air Lines', country: 'United States' },
  { code: 'UA', name: 'United Airlines', country: 'United States' },
  { code: 'WN', name: 'Southwest Airlines', country: 'United States' },
  { code: 'B6', name: 'JetBlue', country: 'United States' },
  { code: 'AS', name: 'Alaska Airlines', country: 'United States' },
  { code: 'NK', name: 'Spirit Airlines', country: 'United States' },
  { code: 'F9', name: 'Frontier Airlines', country: 'United States' },
  { code: 'BA', name: 'British Airways', country: 'United Kingdom' },
  { code: 'LH', name: 'Lufthansa', country: 'Germany' },
  { code: 'AF', name: 'Air France', country: 'France' },
  { code: 'KL', name: 'KLM', country: 'Netherlands' },
  { code: 'EK', name: 'Emirates', country: 'United Arab Emirates' },
  { code: 'QR', name: 'Qatar Airways', country: 'Qatar' },
  { code: 'SQ', name: 'Singapore Airlines', country: 'Singapore' },
  { code: 'CX', name: 'Cathay Pacific', country: 'Hong Kong' },
  { code: 'JL', name: 'Japan Airlines', country: 'Japan' },
  { code: 'NH', name: 'ANA', country: 'Japan' },
  { code: 'TK', name: 'Turkish Airlines', country: 'Turkey' },
  { code: 'LX', name: 'Swiss', country: 'Switzerland' },
];

// Matches a free-typed airline name (the review form's "Airline" field is
// plain text, not picked from a list) against the curated catalog above —
// same best-effort matching approach as aircraftPhoto.js's keyword lookup.
// Only used to enrich a display with logo/country when we can; an unmatched
// airline just shows the raw text the user typed, no error.
export function matchAirline(rawText) {
  if (!rawText) return null;
  const normalized = rawText.trim().toLowerCase();
  if (!normalized) return null;

  const byCode = COMMON_AIRLINES.find((a) => a.code.toLowerCase() === normalized);
  if (byCode) return byCode;

  return (
    COMMON_AIRLINES.find((a) => {
      const name = a.name.toLowerCase();
      return normalized.includes(name) || name.includes(normalized) || normalized.includes(name.split(' ')[0]);
    }) ?? null
  );
}
