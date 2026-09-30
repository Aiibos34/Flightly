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
- **Later**: swap in a flight-data API lookup (AviationStack, AeroDataBox, or FlightAware — free tiers 100–600 calls/month, paid tiers ~$50–100/mo for 10k calls). **Also evaluate Flightradar24's API** (needs a Flightradar24 account login to access) as another candidate — not yet compared against the others above on cost/coverage/rate limits. Also relevant to the globe map / route-tracking backlog items below, which already had OpenSky Network as a candidate data source — worth comparing Flightradar24 against OpenSky for that use case too, not just flight-number lookup.
- Design requirement: structured fields from day one (not free text) so the API swap is a clean addition. Cache every API result in our own DB so lookups are billed once per unique flight, not once per user.

## Data Model

**FlightReview**
```
FlightReview {
  id, userId, username, createdAt
  airline, flightNumber (optional), date (free text, but the New Flight Review
                   form auto-formats as it's typed: digits only, "\" inserted
                   after DD and MM — see formatDateInput in NewFlightReviewScreen.js),
                   departureAirport, arrivalAirport, aircraftType
                   // airline/departureAirport/arrivalAirport/aircraftType are typed
                   // into SearchableField — free text still wins on submit, but
                   // suggestions autocomplete against COMMON_AIRLINES / AIRPORTS /
                   // COMMON_AIRCRAFT as you type (components/SearchableField.js)
  cabinClass       "economy" | "premium economy" | "business" | "first"
                   // 4-way picker, same visual style as the wifi-quality picker
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
  mealDescription  (optional free text — "What was the meal?" — powers the
                   crowd-sourced meal lookup on Upcoming Flights, see utils/mealInfo.js)
  photos: [ { url, category: "aircraft" | "cabin" | "seat" | "food" | "alcohol" | "other" } ]
                   // tagged, multiple per category allowed — powers the photo carousel
                   // and contextual taps (e.g. tapping aircraft name shows "aircraft"-tagged photo)
  likesCount, commentsCount
  syncStatus       "pending" | "synced"   // offline-first support
  verified         (boolean — future, boarding pass check)
  boardingPassPhoto (optional, future)
  shareCardURL     (cached generated share-image, optional — NOT currently used;
                   see Share Cards note below, capture is regenerated fresh each
                   time instead since there's no Storage to cache it to)
}
```

**UpcomingFlight** (lightweight — a flight not yet taken, separate from the
after-the-fact FlightReview model; exists solely to attach a meal lookup to
a booked-but-not-flown trip)
```
UpcomingFlight { id, userId, airline, flightNumber (optional), date, departureAirport, arrivalAirport, createdAt }
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

**Story** — standalone camera/gallery upload, deliberately NOT tied to a
review (earlier draft had it point back to a FlightReview; that was scrapped
— you can post a story any time, not just alongside a logged flight)
```
stories/{id} {
  userId, username, mediaURL, mediaType: "image" | "video", createdAt
}
// Grouped by user client-side (not deduped to "latest only") — someone
// with 3 active (<24h) stories gets 3 progress-bar segments in the viewer,
// tapped through in sequence before moving to the next person. See
// FeedScreen.js's storyGroups useMemo and StoryViewerScreen.js.
// Local-device watched-state (not synced) in AsyncStorage — utils/storyViews.js.
```

**Badge** — bundled as a local JS catalog (utils/badges.js), NOT a Firestore
collection. Static content + Ionicons name instead of a hosted iconURL, so
there's zero Storage cost and no seed step.
```
// utils/badges.js: BADGES = [{ key, title, description, icon (Ionicons name) }, ...]
// Most badges are review-stat-derived (flight count, unique airports/airlines,
// a 5.0 rating, excellent wifi, free alcohol) and auto-evaluated by
// syncEarnedBadges(userId, reviews) whenever reviews load. Two (recruiter,
// welcome_aboard) are event-triggered via awardBadge(userId, key) from the
// referral flow instead, since they're not a computable stat.
users/{uid}/badges/{badgeKey} { userId, badgeKey, earnedAt, shared (boolean) }
```

**Referral**
```
referrals/{id} { referrerUserId, referredUserId, createdAt }
// users/{uid}.referralCode — unique 6-char code (A-Z2-9, no ambiguous chars),
// generated lazily on first visit to Invite Friends (utils/referral.js).
// Redeeming a code at signup awards both sides a badge (recruiter / welcome_aboard).
```

**Chat / Message** — direct messages. Deterministic chatId (`[uidA, uidB].sort().join('_')`)
so two people always land in the same thread without an indexed lookup query.
```
chats/{chatId} {
  participantIds: [uidA, uidB]
  participantUsernames: { [uid]: username }
  lastMessage, lastMessageAt, lastMessageSenderId
  lastRead: { [uid]: timestamp }   // per-participant read receipt — powers
                                    // both the chat-list unread red dot and
                                    // the "Seen" label under your last message.
                                    // MUST be written via updateDoc's dot-path
                                    // key ({[`lastRead.${uid}`]: ...}) — a plain
                                    // setDoc(...,{merge:true}) with a dotted
                                    // object key does NOT nest, it creates a
                                    // literal field named "lastRead.xyz". Bit us
                                    // once already; utils/chats.js's markChatRead
                                    // does this correctly, copy that, don't
                                    // reinvent it in a script.
}
chats/{chatId}/messages/{id} { senderId, text, createdAt, meta? }
// meta.storyReply + meta.storyMediaURL set when the message originated from
// the story-reply bar (see below) — shown as "Replied to your story" in ChatScreen.
```

**Comment / Like** — small subcollections under each review:
```
reviews/{id}/comments/{id} { userId, username, text, createdAt }
reviews/{id}/likes/{userId} { userId, createdAt }   // doc ID IS the liker's uid
// likesCount/commentsCount on the review doc are denormalized counters,
// incremented via Firestore's increment() — not recomputed live.
```

## Screen List

**Phase 1:**
1. Auth — sign-up now also has an optional "Invite code" field (see Referral above)
2. Feed (stories bar + post feed) — top-right header has two icons: airplane (→ Chat List, with an unread red dot) and notifications bell (still decorative, unwired)
3. Story Viewer — full rebuild, see "Stories & DMs" section below
4. Flight Review Detail — ratings, photo carousel (swipeable, category-labeled), comments, likes, Share button (now wired, opens the Share Card overlay), meal description (if set), flight distance next to the route (computed free from bundled airport coordinates, see utils/airportInfo.js), route + airline are tappable → Airport/Airline Detail.
   - Tap aircraft name → shows the "aircraft"-tagged photo if the reviewer uploaded one, else a live Wikipedia reference photo (see "Aircraft/airline photo gotchas" below for why this took several rounds to get working).
   - Own posts get a pencil icon in the header → opens New Flight Review in edit mode.
5. New Flight Review (logging form — works offline). Order: airline (searchable) → flight number → date (auto-formats DD\MM\YYYY) → departure/arrival airport (searchable) → aircraft type (searchable) → cabin class (4-way picker) → caption → meal description → photos (aircraft/cabin/seat/food/alcohol) → free alcohol + wifi (4-level quality picker) → rating bars (food/seat comfort/crew/multimedia) → submit, overall computed as their average. Posting a review that unlocks a new badge shows the Share Card overlay (badge variant) instead of a plain alert.
6. Profile (own + others') — bio, posts/followers/following row, badge showcase row (earned badges only), favorite airline/aircraft slots, aviation stats row (flights/airports/airlines — all three now tappable, airports/airlines open Stat List → Airport/Airline Detail; flights opens Flight History), follow button, Instagram-grid of post thumbnails. ⋯ menu (own profile only): Edit bio, Invite friends, Upcoming flights, Account.
7. Flight History
8. Comments
9. Search/Discover
10. Account
11. Badges — real grid now (3 columns, earned = filled gold, locked = outlined), not the Phase 1 placeholder
12. Invite Friends — your code in large text, native share sheet, count of friends who joined via it
13. Follow List

**Added this session (not in the original Phase 1–2 plan):**
14. Stat List — tap "airports" or "airlines" on your profile to see every one you've flown, with a flight count each
15. Airport Detail / Airline Detail — real info (name/city/country for airports; name/country/logo for airlines, matched from free-text via `matchAirline()`) plus your flights there
16. Upcoming Flights — log a not-yet-flown trip (airline/route/date, no ratings), tap to see crowd-sourced meal reports for that airline pulled from everyone's past reviews
17. Story Composer — camera-first creation flow (see below), not a simple upload picker
18. Chat List / Chat — full DM system (see below)

**Cross-cutting flow (component, not a screen):** Share Card Generator (components/ShareCard.js + ShareCardOverlay.js) — triggered from Flight Review Detail's share icon and badge-unlock moments. Fixed navy/gold branding regardless of device theme. `react-native-view-shot` captures the on-screen card, `expo-sharing` hands it to the native OS share sheet. No Storage upload — captured fresh each time from a local file.

**Later, separate piece:** public web preview page for shared links — not needed for mobile MVP.

## Stories & DMs (built this session — a real feature, not the Phase 1 placeholder)

The original Phase 1 "story" was just a synthetic view of your most recent review from the last 24h — no upload flow, no Story documents. That's gone. Stories are now fully standalone:

- **Composer** (StoryComposerScreen.js): tapping the gold **+** badge on your own story circle opens a locked-in in-app camera (`expo-camera`'s `CameraView`, not the system camera app) with a shutter button and a gallery icon to switch to picking existing media instead. Either path lands on a **preview step** (not posted yet) with a gold "Post story" bar. Supports photo *and* video.
- **Viewer** (StoryViewerScreen.js): Instagram-style —
  - Per-story progress segments (one per story *within that person's group*, not one per person)
  - 3D **cube-turn transition** between stories (rotateY + perspective on both the outgoing and incoming story simultaneously, native-driven)
  - Smooth `Animated.timing`-driven progress bar (a `setInterval` tick was the original, visibly stepped, approach — don't regress to that)
  - Press-and-hold anywhere pauses (immediate on press-down, resumes via `keyboardDidHide`/`onPressOut`, NOT via a naive onBlur — see gotcha below); quick tap on the left/right half (true 50/50 split) navigates
  - Swipe down to dismiss, with a real "sinking" follow-the-finger animation (`Animated.Value` + `Gesture.Pan`, not a hard cutoff)
  - **Reply bar** at the bottom (hidden on your own story) — sends as a DM to the story owner via `utils/chats.js`'s `ensureChat`/`sendMessage`, with `meta.storyReply` for context
- **DMs**: Chat List (unread red dot per conversation + on the feed's airplane icon) → Chat (other person's avatar top-left, read receipts — "Seen" under your last message once they've opened the thread).

### Hard-won gotchas from building this (read before touching these files again)
- **`GestureDetector`'s pan gesture can silently eat a nested `Pressable`'s `onPress`** even when the gesture never activates — symptom was `onPressIn` firing every time, `onPress` never firing. Fix: keep anything that needs reliable taps (like the reply bar) as a sibling *outside* the `GestureDetector`, not a descendant of it.
- **Resume-on-blur races with tapping a button next to the input it's attached to.** The reply box's `onBlur` immediately unpausing the story could interrupt the Send button's own tap on Android. Fixed by resuming on `Keyboard`'s `keyboardDidHide` event instead, which only fires after the dismiss animation completes.
- **`KeyboardAvoidingView`'s `behavior` must be set for Android too** — `undefined` (the initial code) does nothing there; use `'height'` (or `'padding'`, but `'height'` tested better here) alongside iOS's `'padding'`.
- **Firestore: `setDoc(ref, {'a.b': val}, {merge:true})` does NOT nest** — it creates a literal field named `"a.b"`. Only `updateDoc(ref, {'a.b': val})` treats the dot as a path separator. Cost us a debugging round on the read-receipts feature.

## Aircraft/airline photo gotchas (also hard-won — read before re-touching utils/aircraftPhoto.js)
- Wikipedia's REST API (`en.wikipedia.org/api/rest_v1/page/summary/...`) **rejects requests without a descriptive `User-Agent` header** (403) — confirmed via on-device console logging, not a guess. Browsers send one automatically so this never showed up testing via a browser; React Native's `fetch` doesn't, so it must be set explicitly (see `WIKIPEDIA_HEADERS` in utils/aircraftPhoto.js).
- **This applies separately to the image CDN too** (`upload.wikimedia.org`), not just the API host — and React Native's `<Image source={{uri, headers}}>` per-request headers option did **not** reliably work around it even when set (device logs showed the CDN still 403ing). The actual fix: download the image via our own working `fetch()` (with the header) and convert to a `data:` URI, so `<Image>` has nothing left to make its own request for. See `imageUrlToDataUri` in utils/aircraftPhoto.js.
- A burst of ~16 simultaneous lookups (the favorite-aircraft picker mounting all rows at once) can also trip Wikipedia's rate limiting independently of the above — the queue + retry-with-backoff logic in aircraftPhoto.js is defense-in-depth for that, kept even after the real 403 cause was found and fixed.
- If you ever add photos from a new external host for review/story content, **verify what the image actually shows before trusting a guessed filename/ID** — several blind-guessed Unsplash photo IDs during the review-seeding work turned out to be a camera, a tote bag, and a cargo ship. Unsplash's own search endpoint (`unsplash.com/napi/search/photos?query=...`) returns real `alt_description` text per result and is far more reliable than guessing IDs from memory.

## Backlog
- (done) Add airline logos — see User.favoriteAirlineCode above.
- (done) Add aircraft type photos — see User.favoriteAircraftType above.
- (done) Fix bio save — explicit Cancel/Save buttons in the ⋯ → Edit bio flow.
- (done) Badges, invite/referral, share cards, airport/airline info, meal spec, search-as-you-type, formatted date input, cabin class, Stories rebuild, full DM system — see sections above.

### Open now
- **Interactive globe map** — see people you follow while they're currently mid-flight, tap for details. Large, unscoped: nothing in the app currently models a flight *while in progress* (UpcomingFlight is pre-flight, FlightReview is post-flight) — would need a new "live flight" concept with real start/end times, plus an actual 3D-globe rendering approach (not just react-native-maps, which doesn't do a globe projection). Possibly related to the "route on a map" request below — worth scoping together.
- **Route on a map** — tapping a post's route (departure → arrival) should open a map showing the route plotted alongside the flight's data, instead of doing nothing extra beyond the existing airport-detail-on-tap behavior. Much smaller than the globe map (a single flight's route, not live in-progress flights) — worth deciding whether this is a step toward the globe map or a separate, simpler feature.
- **"Carmen to-do list recs"** — 7 UI/rating-model tweaks, in progress (see per-item status below).
- **Flightradar24 API** — log in to a Flightradar24 account and evaluate their API as a flight-data source. Not yet compared against the already-noted options (AviationStack/AeroDataBox/FlightAware for flight-number lookup, OpenSky Network for live route/track data) — see "Flight data entry" section above. Could feed either the manual-entry-replacement lookup or the globe map / route-on-a-map live-tracking features, depending on what their API actually covers.
- Aircraft/review photos are stored as remote URLs directly (Unsplash for seeded test data) or local device URIs (real user uploads) — no Firebase Storage involved anywhere. Same constraint as Phase 1.5 below.

**Note:** the LLM council session on 2026-08-14 recommended freezing all of the above (globe map, route-on-a-map, Carmen's remaining items, Flightradar24) until real users have validated the core social loop — see that session's transcript in conversation history for the full reasoning. Listed here for tracking, not as next-up work.

#### Carmen's list — status
1. (done) Caption truncation — clamped to 2 lines on the feed, with a bold/gold/uppercase "Read more" link (styled distinctly from caption text, not inline with it). See ReviewCard.js.
2. (done) Emoji rating labels with tap-to-reveal description — every rating category (utils/ratingMeta.js's RATING_CATEGORIES) has an emoji + description. On the feed/detail chips (CategoryRatings.js) the emoji shows at 16px (matching the overall-rating star size) next to a small text label; tapping a chip shows the description via toast. On the input form (RatingBar.js) only the emoji is shown next to each bar — no word label — tapping it reveals the name + description via toast.
3. (done) N/A option for food/multimedia ratings — checkbox toggle next to each; when on, the drag bar is replaced with a grayed placeholder and the value is stored as `null` instead of a forced 0–5 number. seatComfort/flightAttendants have no N/A option (still mandatory).
4. (done) Bag-allowance rating — no longer a 0–5 drag bar. Now a 4-way discrete chip picker (none / limited / standard / generous, `BAG_ALLOWANCE_LEVELS` in utils/ratingMeta.js), same visual pattern as the wifi-quality/cabin-class pickers. Still N/A-able (checkbox), still excluded from the overall score. `ratings.bagAllowance` is now a string (or `null`), not a number — reviews saved before this change simply predate the field entirely (none were ever saved with the old numeric version).
5. (not started) Meal integration on Upcoming Flights — likely already covered by the existing crowd-sourced `MealReportsPanel` on UpcomingFlightsScreen.js; check with Carmen whether she meant something beyond that before building anything new.
6. (not started / undecided) Maybe drop the crew rating.
7. (not started) Specific rating display order — spec not yet gathered from Carmen.

#### Done since 2026-08-13 (new requests)
- Caption field in the New Flight Review form now labeled "Caption (optional)".
- **Fixed bug**: wifi/class/free-alcohol chips on the feed/detail now show their description on tap, same as the rating chips (`CategoryRatings.js`'s `INFO_META`). Note for future debugging: verifying this live took longer than expected because react-native-web's `Pressable` uses an internal press-responder state machine, not a plain click handler — a bare synthetic `click` event doesn't always reliably trigger it, and can give a false "not working" reading in DOM-level testing that isn't a real bug. A `console.log` inside the handler + hot reload was what actually settled it.
- Double-tap a photo to like it (Instagram-style) — `components/PhotoCarousel.js` now takes `reviewId`/`userId`, detects a double-tap via a timestamp check (not react-native-gesture-handler — a plain `Pressable` inside the existing `ScrollView` was simpler and didn't hit the gesture-negotiation issues documented elsewhere in this app), shows a heart-pop animation on every double-tap, and idempotently likes via the new `utils/likes.js`'s `likeReview()` (a getDoc-then-set, distinct from `LikeButton.js`'s toggle since double-tap has no local liked/unliked state to branch on). Wired into both the feed and the detail screen's carousel.

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
- **Phase 1 (MVP)**: done, verified end-to-end as of 2026-08-10.
- **Phase 1.5**: offline photo upload — still on hold pending the Blaze plan decision, not started.
- **Phase 2**: done as of 2026-08-13 — badges, invite/referral, share cards, plus a lot that grew out of it along the way (airport/airline info, meal spec, search-as-you-type, formatted date input, cabin class, and two features not in the original plan at all: a real Stories feature and a full DM system). See "Stories & DMs" section above for what was actually built.
- **Phase 2+**: tap route → flown path with altitude/speed/other track data (OpenSky Network worth investigating, free but rate-limited); exact tail-number aircraft photos via a spotter-photo database (real licensing cost). Also now: the interactive globe map idea (see Backlog) probably belongs in this tier given its scope.

## Open items (not yet decided)
- **Interactive globe map** — needs scoping (data model + rendering approach) before any implementation starts. Possibly worth scoping together with the "route on a map" request (see Backlog → Open now) since both involve map rendering.
- Whether/when to revisit Phase 1.5 (offline photo upload) now that Storage would also unblock cross-device photo visibility more generally (currently every photo in the app — review, profile, story — is a local device URI or an external URL, never uploaded; a photo you post is not guaranteed to render correctly on someone else's device).
- Carmen's 7-item rec list — in progress, see per-item status under Backlog → "Carmen's list — status" above. Items 5–7 need her input before anything can be built.

## Done since last full review (2026-08-13)
- **Firestore security rules** — written and deployed live (firestore.rules), replacing the wide-open test-mode rule. Per-collection ruleset covering users/reviews/comments/likes/follows/badges/referrals/chats+messages, matched against the app's actual read/write calls rather than an idealized schema. Verified live: feed reads, like-count increments, and the chats "only participants" rule all confirmed working post-deploy. One accepted gap, documented in the rules file itself: users/{uid} (including email) is readable by any signed-in user since Firestore rules can't restrict individual fields within a document — the UI never shows anyone else's email, but a raw API call technically could. Fixing that means splitting email into a private doc, a data-model change not done here.
- A round of general polish: haptics (expo-haptics) on likes/follows/badge-unlocks/story nav/review submit; a custom in-app toast system (components/Toast.js) replacing every Alert.alert; pull-to-refresh on Feed/Profile/Chat List; loading skeletons (components/Skeleton.js) on Feed/Profile; a shared EmptyState component replacing bare "no data" text across Chat List/Follow List/Stat List/Search/Flight History/Upcoming Flights; and a fade/rise ScreenTransition wrapper in App.js (the app has no navigation library — screens are swapped via plain state — so this was hand-rolled rather than coming from a nav library's built-in transitions).
- Carmen's list items 1–4 (caption truncation, emoji tap-to-reveal ratings, N/A ratings, bag-allowance rating) — see per-item status above. Plus, from the same session: caption marked optional, a real bug fix (wifi/class chip descriptions weren't wired up), and double-tap-to-like on photos. See "Carmen's list — status" and "Done since 2026-08-13 (new requests)" above for detail.

## Test/seed data on this Firebase project (for reference in a fresh session)
Real account: badanjo@outlook.com (yours). Seeded fake accounts for testing (all have a real Firestore `users` doc with `photoURL`, so avatars render): `test_user_amelia` (amelia_flies), `test_user_jet` (jet_setter_joe), `test_user_runway` (runway_ruth), `test_user_dana` (captain_dana), `test_user_marcus` (marcus_flies_often), plus 10 more from the batch review-seeding pass (sophia_wanders, budget_backpacker_tom, globalgrace, quick_hopper_dave, luxurylayla, mileage_runner_priya, the_aisle_seat_guy, windowseat_wendy, redeye_robert, firstclass_faisal) — each with a full review (all 5 photo categories, verified-accurate photos, varied ratings from 1.25 to 5.00, some with comments). These aren't real Firebase Auth users, just Firestore documents — fine for display/testing, but they can't log in or receive push notifications.
