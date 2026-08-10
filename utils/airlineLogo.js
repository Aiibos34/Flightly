// pics.avs.io is the public logo CDN behind the Aviasales/Travelpayouts flight
// widgets — no API key needed, hotlinkable directly by IATA code.
export function getAirlineLogoUrl(iataCode) {
  if (!iataCode) return null;
  return `https://pics.avs.io/200/200/${iataCode.toUpperCase()}.png`;
}

export const COMMON_AIRLINES = [
  { code: 'AA', name: 'American Airlines' },
  { code: 'DL', name: 'Delta Air Lines' },
  { code: 'UA', name: 'United Airlines' },
  { code: 'WN', name: 'Southwest Airlines' },
  { code: 'B6', name: 'JetBlue' },
  { code: 'AS', name: 'Alaska Airlines' },
  { code: 'NK', name: 'Spirit Airlines' },
  { code: 'F9', name: 'Frontier Airlines' },
  { code: 'BA', name: 'British Airways' },
  { code: 'LH', name: 'Lufthansa' },
  { code: 'AF', name: 'Air France' },
  { code: 'KL', name: 'KLM' },
  { code: 'EK', name: 'Emirates' },
  { code: 'QR', name: 'Qatar Airways' },
  { code: 'SQ', name: 'Singapore Airlines' },
  { code: 'CX', name: 'Cathay Pacific' },
  { code: 'JL', name: 'Japan Airlines' },
  { code: 'NH', name: 'ANA' },
  { code: 'TK', name: 'Turkish Airlines' },
  { code: 'LX', name: 'Swiss' },
];
