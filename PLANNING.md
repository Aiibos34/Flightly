# Flightly — Planning Summary

Social flight & aircraft rating app ("Untappd for flights"). Separate project from APP1 (geo-guess app), same general stack (Expo + Firebase).

## Market
- Niche is occupied by seat-map tools (SeatGuru, FlightR, SeatMap.app, AeroLOPA, ExpertFlyer) — none have a social/community layer. That's the differentiation wedge.

## Monetization target
- $1,000/month realistic mainly via subscription: ~250–350 paying users at $2.99–4.99/mo, out of ~7,000–15,000 total users. Ads would need 10k–30k MAU instead — subscription is the more achievable path for a niche audience.
- Expect 6–12+ months of audience building via aviation communities (Reddit, Discord, aviation content creators).

## Monthly expenses (to start)
- ~$8–15/month, mostly the $99/year Apple Developer fee. Firebase (Spark free tier) and Expo (free tier) cover a small app at launch. Google Play is a one-time $25.

## Flight data entry
- **Phase 1**: manual entry (airline, flight number, date, route, aircraft type) — $0 cost.
- **Later**: swap in a flight-data API lookup (AviationStack, AeroDataBox, or FlightAware — free tiers 100–600 calls/month, paid tiers ~$50–100/mo for 10k calls).
- Design requirement: structured fields from day one (not free text) so the API swap is a clean addition. Cache every API result in our own DB so lookups are billed once per unique flight, not once per user.

## Data Model

**FlightReview**
```
FlightReview {
  id, userId, createdAt
  airline, flightNumber (optional), date, departureAirport, arrivalAirport, aircraftType
  ratings: { food, seatComfort, flightAttendants, multimedia, overall }
                   // food/seatComfort/flightAttendants/multimedia are user-entered,
                   // 0–5 in 0.25 increments, via a drag bar with tick marks at every
                   // step (react-native-gesture-handler — Pressable/PanResponder both
                   // lost the drag gesture to the enclosing ScrollView's native touch
                   // interception on Android). overall is NOT user-entered — it's the
                   // average of the other four, computed at submit time and shown on
                   // the post. wifiQuality was removed as a 5th bar (see hasWifi below).
  freeAlcohol      (boolean)
  hasWifi          (boolean)
  wifiQuality      "unusable" | "not bad" | "good" | "excellent" | null
                   // a discrete 4-option choice, not a 0–5 bar — only meaningful
                   // when hasWifi is true, null otherwise
  reviewText       (optional — labeled "Caption" in the UI, shown under the photo on the feed card, Instagram-style)
  photos: [ { url, category: "aircraft" | "cabin" | "seat" | "food" | "alcohol" | "other" } ]
                   // tagged, multiple per category allowed — powers the photo carousel
                   // and contextual taps (e.g. tapping aircraft name shows "aircraft"-tagged photo)
  likesCount, commentsCount
  syncStatus       "pending" | "synced"   // offline-first support
  verified         (boolean — future, boarding pass check)
  boardingPassPhoto (optional, future)
  shareCardURL     (cached generated share-image, optional)
}
```

**User**
```
User {
  id (== uid), email, username   (username auto-derived from email prefix at signup)
  photoURL          (image URI, user-picked via the + button on their avatar)
  bio               (string, user-editable on own profile via the profile's ⋯ menu)
  favoriteAirlineCode   (IATA code picked from a short list, e.g. "DL" — logo rendered live via
                        pics.avs.io/{size}/{size}/{code}.png, the public no-key CDN behind the
                        Aviasales/Travelpayouts widgets, not a bundled/copyrighted asset)
  favoriteAircraftType (free-text, e.g. "Boeing 777" — photo resolved live via Wikipedia's own
                        REST API (page summary thumbnail), keyword-matched to the right article;
                        same lookup powers the "tap aircraft name" reference-photo fallback on
                        Flight Review Detail. Live lookup, not a bundled photo set, so it works
                        for any aircraft type text without us curating images ourselves.)
  instagramHandle   (optional, simple link — not yet built)
  phoneHash         (optional — hashed phone number, for privacy-safe contact matching — not yet built)
  referralCode      (unique, auto-generated — not yet built)
  referredBy        (userId, optional — not yet built)
  // stats (flights/airports/airlines) are computed live from the reviews
  // collection, not stored on the user doc — avoids keeping counters in sync.
}
```

**Follow relationship** (subcollections, not arrays — mirrors the Likes pattern so it scales past Firestore's array-size practicalities)
```
users/{uid}/followers/{followerUid}  { userId, createdAt }
users/{uid}/following/{followingUid} { userId, createdAt }
// written on both sides on follow so "who follows me" and "who do I follow"
// are each directly queryable without a cross-collection query.
// Counts read via getCountFromServer() (Firestore's aggregate query), not
// a maintained counter field — refetched after each follow/unfollow toggle.
```

**Story** (lightweight, points back to a review)
```
Story {
  id, userId, reviewId, mediaURL, createdAt, expiresAt (24h)
}
```

**Badge**
```
Badge { id, key, title, description, iconURL }
```

**UserBadge**
```
UserBadge { userId, badgeId, earnedAt, shared (boolean) }
```

**Referral**
```
Referral { id, referrerUserId, referredUserId, createdAt }
```

**Comment / Like** — small subcollections under each review: `{ id, reviewId, userId, text?, createdAt }`

## Screen List
1. Auth
2. Feed (stories bar + post feed)
3. Story Viewer (links to full review)
4. Flight Review Detail — ratings, photo carousel (swipeable, category-labeled), comments, likes, Share button.
   - Tap aircraft name → shows the "aircraft"-tagged photo if the reviewer uploaded one, else a bundled generic reference photo for that aircraft model (no API needed).
   - Tap route ("JFK–LHR") → **deferred to Phase 2+**, see below.
   - Own posts get a pencil icon in the header → opens New Flight Review in edit mode (same screen/component, pre-filled, `updateDoc` instead of `addDoc`), so any field or photo can be retyped/replaced after posting.
5. New Flight Review (logging form — works offline). Order: airline/flight number/date/departure/arrival/aircraft → caption → photos (aircraft/cabin/seat/food/alcohol) → free alcohol + wifi (with a 4-level quality picker when wifi is on) → rating bars (food/seat comfort/crew/multimedia) → submit, with overall computed as their average.
6. Profile (own + others') — bio (editable on own profile), posts/followers/following row (each tappable — posts opens Flight History for that user, followers/following open Follow List), aviation stats row, follow button on other users' profiles, Instagram-grid of post thumbnails (first photo per review). Instagram link/QR code/badge showcase still not built.
   - Favorite airline/aircraft are picked from lists (COMMON_AIRLINES / COMMON_AIRCRAFT), not free text — matches the airline picker's UX, and avoids typos that would fail to resolve a photo.
13. Follow List (followers or following) — resolves each subcollection entry to a profile (username), tap to open that person's profile.
7. Flight History
8. Comments
9. Search/Discover
10. Account (Theme under a Display subsection, Flight history, Sign out in red at the bottom) — reached via the ⋯ menu on your own profile, replaces the earlier separate "Settings" screen concept
11. Badges/Achievements
12. Invite Friends (referral code/link, share sheet, optional contact matching)

**Cross-cutting flow (component, not a screen):** Share Card Generator — triggered from Flight Review Detail and badge-unlock moments. Branded image, opens native OS share sheet (covers Instagram Story automatically).

**Later, separate piece:** public web preview page for shared links (what a non-app-user sees when they click a shared link) — build once there's real content to preview, not needed for mobile MVP.

## Backlog
- (done) Add airline logos — see User.favoriteAirlineCode above.
- (done) Add aircraft type photos — see User.favoriteAircraftType above.
- (done) Fix bio save — explicit Cancel/Save buttons in the ⋯ → Edit bio flow.

## Note on picker/overlay UI
RN's `Modal` component didn't close reliably on a real device (confirmed, not a web-only quirk) when used for the favorite airline/aircraft pickers. Replaced with plain in-flow `View`s that expand below the trigger — the same pattern already proven to work for the ⋯ menu and bio editing. Prefer that pattern over `Modal` for future picker/overlay UI in this app.

## Growth / engagement mechanics
- Share to Instagram Story (branded review/badge card via native share sheet — no Meta API needed)
- Milestone share prompts (badge unlock → one-tap share)
- Public web preview for shared links (converts link clicks to installs)
- QR code on profile/card (in-person add)
- Referral rewards (invite friends → badge/perk)
- Find friends via contacts (hashed phone matching, privacy-conscious)
- Push notifications: "log it while it's fresh" on landing, comment/like notifications, weekly social-proof recap
- Deliberately **no streaks** — flying is low-frequency, so a streak mechanic would either be meaningless or push people to fabricate flights. Variable reward (likes/badges) + investment (flight history/social graph) drive the hook instead, without the guilt-based mechanic.

## Design
- **Color psychology**: navy blue (trust, calm, doubles as sky/aviation association — most airline brands already use blue) as primary, warm gold/amber as accent for ratings/badges/CTAs (achievement, "gold standard," premium feel). Deliberately avoided red for notification badges (proven to spike anxiety-driven app opens, consistent with skipping streaks) — gold used for "something new" indicators instead.
- **Theme**: both light and dark supported, **dark is default**. Navy and gold stay the brand pair in both themes, but their roles swap — dark mode uses navy as background with gold popping on top; light mode uses navy as text/icon color with a deeper amber standing in for gold wherever it needs to read as text (bright gold alone doesn't have enough contrast on light backgrounds). Approved palette:

  | Role | Dark mode | Light mode |
  |---|---|---|
  | Page/screen background | `#0B1830` (navy) | `#F5F8FC` (pale sky blue-white) |
  | Card / chip surface | `#16264A` | `#EAF0F8` |
  | Border | `#1C3155` | `#E1E8F2` |
  | Text primary | `#F2F5FA` | `#10213D` |
  | Text secondary | `#9FB2CC` | `#55698A` |
  | Text muted | `#7E93B3` | `#8B9AB5` |
  | Accent — text/numbers (ratings, wordmark) | `#F0B429` (bright gold) | `#B8790A` (deep amber, needs contrast on light bg) |
  | Accent — fills (story ring, add-button circle) | `#F0B429` | `#F0B429` (same — fills don't need text-level contrast) |
  | Icon on gold fill (e.g. add button) | `#0B1830` | `#10213D` |
  | Avatar placeholder | `#22406B` / `#3A5578` (varied) | `#C7D2E3` / `#B9C6DC` (varied) |

- Sample feed screen mockups (both themes) approved as the visual direction: story circles with gold ring = unwatched, review card with big accent overall score + 2x2 category chips (food/seat/crew/alcohol), gold "add flight" button as primary bottom-nav action.

## Offline-first decision
- **Phase 1**: offline support for ratings/text (Firestore's built-in offline persistence — near-free). A user can fully rate a flight mid-air with no wifi; it syncs on landing.
- **Phase 1.5**: offline photo upload (local caching, connectivity listener, retry queue, pending-state UI) — deferred because it's real engineering cost with no user-facing difference in the common case (nobody expects photos to post at 35,000 ft anyway; ratings while memory is fresh is the actual hook).

## Phasing
- **Phase 1 (MVP)**: screens 1–9, core review/feed/history loop, offline ratings, tagged photo carousel, aircraft-name-tap (own photo or generic fallback).
- **Phase 1.5**: offline photo upload.
- **Phase 2**: badges, invite/referral, share cards, once the core loop is validated with real users.
- **Phase 2+**: tap route → flown path with altitude/speed/other track data. Needs a *track/trajectory* data source, which is a different (often pricier) category of API than the schedule-lookup ones already planned (AviationStack/AeroDataBox/FlightAware cover flight info, not historical trajectory). **OpenSky Network** offers free historical track data via a research-oriented REST API — worth investigating first, but rate-limited. Also Phase 2+: exact tail-number aircraft photos via a spotter-photo database (JetPhotos/Planespotters-style) — real API/licensing cost, deferred.

## Open items (not yet decided)
- None — Phase 1 (screens 1–9, likes, photo carousel, offline ratings, real Firestore data throughout) is built and verified working end-to-end as of 2026-08-10.
- Phase 1.5 (offline photo upload to Storage) is on hold pending the Blaze plan decision.
- Phase 2 (badges, invite/referral, share cards) is next up when ready.
