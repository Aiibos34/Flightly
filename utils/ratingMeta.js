// Single source of truth for rating category metadata — emoji + description
// shown across the input form (RatingBar), the feed/detail chips
// (CategoryRatings), so labels/descriptions can't drift between the two.
//
// `allowNA` categories (food, multimedia) can be marked "not applicable"
// instead of forced into a 0-5 score — not every flight has a meal or
// working screens worth rating. seatComfort and flightAttendants stay
// mandatory.
export const RATING_CATEGORIES = [
  {
    key: 'food',
    label: 'Food',
    emoji: '🍽️',
    description: 'Quality of the meal or snack service.',
    allowNA: true,
  },
  {
    key: 'seatComfort',
    label: 'Seat comfort',
    emoji: '💺',
    description: 'Legroom, cushioning, and recline.',
    allowNA: false,
  },
  {
    key: 'flightAttendants',
    label: 'Crew',
    emoji: '🧑‍✈️',
    description: 'Service and attentiveness of the flight attendants.',
    allowNA: false,
  },
  {
    key: 'multimedia',
    label: 'Multimedia',
    emoji: '📺',
    description: 'In-seat entertainment screen and content.',
    allowNA: true,
  },
];

// Bag allowance isn't a smooth 0-5 quality gradient the way the categories
// above are — it's closer to "how many free bags did I actually get," which
// is inherently a handful of discrete tiers, not a continuum. Picked 4
// levels (same size as WIFI_LEVELS in NewFlightReviewScreen, and rendered
// with the same 4-way chip picker pattern) rather than a drag bar. Still
// N/A-able like food/multimedia — not every review wants to weigh in on
// bag policy — and, like those, excluded from the overall score.
export const BAG_ALLOWANCE = {
  key: 'bagAllowance',
  label: 'Bag allowance',
  emoji: '🧳',
  description: "How generous the airline's carry-on/checked bag policy felt. Doesn't count toward the overall score.",
};
export const BAG_ALLOWANCE_LEVELS = ['none', 'limited', 'standard', 'generous'];

const OVERALL_KEYS = ['food', 'seatComfort', 'flightAttendants', 'multimedia'];

export function snapToQuarter(v) {
  return Math.round(v * 4) / 4;
}

// Averages whichever of the four overall-eligible categories were actually
// rated (not marked N/A) — seatComfort/flightAttendants are always present,
// so this never divides by zero.
export function computeOverall(ratings) {
  const parts = OVERALL_KEYS.map((k) => ratings[k]).filter((v) => v != null);
  if (parts.length === 0) return 0;
  return snapToQuarter(parts.reduce((a, b) => a + b, 0) / parts.length);
}
