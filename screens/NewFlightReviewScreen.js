import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, Switch, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, doc, addDoc, updateDoc, serverTimestamp, getDocs, query, where } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import RatingBar from '../components/RatingBar';
import ScreenHeader from '../components/ScreenHeader';
import ShareCardOverlay from '../components/ShareCardOverlay';
import SearchableField from '../components/SearchableField';
import { useToast } from '../components/Toast';
import { haptics } from '../utils/haptics';
import { syncEarnedBadges } from '../utils/badges';
import { COMMON_AIRLINES } from '../utils/airlineLogo';
import { AIRPORTS } from '../utils/airportInfo';
import { COMMON_AIRCRAFT } from '../utils/aircraftPhoto';
import { RATING_CATEGORIES, BAG_ALLOWANCE, BAG_ALLOWANCE_LEVELS, computeOverall } from '../utils/ratingMeta';
import { uploadMedia, isLocalUri, reviewPhotoPath } from '../utils/storage';

const PHOTO_CATEGORIES = [
  { key: 'aircraft', label: 'Aircraft' },
  { key: 'cabin', label: 'Cabin' },
  { key: 'seat', label: 'Seat' },
  { key: 'food', label: 'Food' },
  { key: 'alcohol', label: 'Alcohol' },
];

const WIFI_LEVELS = ['unusable', 'not bad', 'good', 'excellent'];
const CABIN_CLASSES = ['economy', 'premium economy', 'business', 'first'];

// Reformats from scratch on every keystroke (strip non-digits, re-insert
// separators) rather than trying to patch the existing string — simplest
// way to get backspacing through a separator to behave correctly for free.
function formatDateInput(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8); // ddmmyyyy
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += '\\' + digits.slice(2, 4);
  if (digits.length > 4) out += '\\' + digits.slice(4, 8);
  return out;
}

export default function NewFlightReviewScreen({ user, onDone, editingReview, onBack }) {
  const { colors } = useTheme();
  const toast = useToast();
  const isEditing = !!editingReview;

  const [photos, setPhotos] = useState(editingReview?.photos ?? []); // { url, category }
  const [reviewText, setReviewText] = useState(editingReview?.reviewText ?? '');
  const [mealDescription, setMealDescription] = useState(editingReview?.mealDescription ?? '');
  const [airline, setAirline] = useState(editingReview?.airline ?? '');
  const [flightNumber, setFlightNumber] = useState(editingReview?.flightNumber ?? '');
  const [date, setDate] = useState(editingReview?.date ?? '');
  const [departureAirport, setDepartureAirport] = useState(editingReview?.departureAirport ?? '');
  const [arrivalAirport, setArrivalAirport] = useState(editingReview?.arrivalAirport ?? '');
  const [aircraftType, setAircraftType] = useState(editingReview?.aircraftType ?? '');
  const [cabinClass, setCabinClass] = useState(editingReview?.cabinClass || CABIN_CLASSES[0]);
  const [freeAlcohol, setFreeAlcohol] = useState(editingReview?.freeAlcohol ?? false);
  const [hasWifi, setHasWifi] = useState(editingReview?.hasWifi ?? false);
  const [wifiQuality, setWifiQuality] = useState(editingReview?.wifiQuality || WIFI_LEVELS[2]);
  const [ratings, setRatings] = useState({
    food: editingReview?.ratings?.food ?? 2.5,
    seatComfort: editingReview?.ratings?.seatComfort ?? 2.5,
    flightAttendants: editingReview?.ratings?.flightAttendants ?? 2.5,
    multimedia: editingReview?.ratings?.multimedia ?? 2.5,
  });
  // Bag allowance is a discrete pick (BAG_ALLOWANCE_LEVELS), not a 0-5 drag
  // value, so it's tracked separately from `ratings` above.
  const [bagAllowance, setBagAllowance] = useState(
    typeof editingReview?.ratings?.bagAllowance === 'string'
      ? editingReview.ratings.bagAllowance
      : BAG_ALLOWANCE_LEVELS[2]
  );
  // N/A only applies when editing a review that was actually saved that way
  // (or predates a category entirely, hence `== null`) — a brand new review
  // always starts everything rated, same as before this feature.
  const [naFlags, setNaFlags] = useState({
    food: isEditing && editingReview?.ratings?.food == null,
    multimedia: isEditing && editingReview?.ratings?.multimedia == null,
    bagAllowance: isEditing && editingReview?.ratings?.bagAllowance == null,
  });
  const [busy, setBusy] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState(null);

  const setRating = (key, value) => setRatings((prev) => ({ ...prev, [key]: value }));
  const toggleNA = (key) => setNaFlags((prev) => ({ ...prev, [key]: !prev[key] }));

  const pickPhoto = async (category) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.info('Permission needed', 'Allow photo access to attach a review photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos((prev) => [...prev.filter((p) => p.category !== category), { url: result.assets[0].uri, category }]);
    }
  };

  // Re-fetches this user's reviews (now including the one just submitted)
  // and returns any newly-qualified badges. Swallows its own errors — a
  // badge-check failure should never make a successfully saved review look
  // like it failed.
  const checkForNewBadges = async (justSubmittedFields) => {
    try {
      const snap = await getDocs(query(collection(db, 'reviews'), where('userId', '==', user.uid)));
      const reviews = [...snap.docs.map((d) => d.data()), justSubmittedFields];
      return await syncEarnedBadges(user.uid, reviews);
    } catch {
      return [];
    }
  };

  const submit = async () => {
    if (!departureAirport || !arrivalAirport || !airline) {
      toast.error('Missing info', 'Add at least the airline and route before submitting.');
      return;
    }
    if (!firebaseReady) {
      toast.error('Firebase not configured', 'Add your Firebase config to .env to save reviews.');
      return;
    }
    setBusy(true);
    try {
      // Photos already at a real URL (editing an existing review, or a
      // seeded external URL) are left alone — only freshly-picked local
      // device URIs get uploaded.
      const uploadedPhotos = await Promise.all(
        photos.map(async (photo) =>
          isLocalUri(photo.url)
            ? { ...photo, url: await uploadMedia(photo.url, reviewPhotoPath(user.uid, photo.category)) }
            : photo
        )
      );
      const finalRatings = {
        ...ratings,
        food: naFlags.food ? null : ratings.food,
        multimedia: naFlags.multimedia ? null : ratings.multimedia,
        bagAllowance: naFlags.bagAllowance ? null : bagAllowance,
      };
      const overall = computeOverall(finalRatings);
      const fields = {
        airline,
        flightNumber: flightNumber || null,
        date: date || null,
        departureAirport: departureAirport.toUpperCase(),
        arrivalAirport: arrivalAirport.toUpperCase(),
        aircraftType,
        cabinClass,
        ratings: { ...finalRatings, overall },
        freeAlcohol,
        hasWifi,
        wifiQuality: hasWifi ? wifiQuality : null,
        reviewText,
        mealDescription: mealDescription || null,
        photos: uploadedPhotos,
      };
      if (isEditing) {
        await updateDoc(doc(db, 'reviews', editingReview.id), fields);
        haptics.success();
        onDone();
      } else {
        // Firestore queues this write in memory and sends it once back online —
        // this is what makes rating a flight mid-air with no wifi work. Durable
        // across an app restart while offline is a Phase 1.5 refinement.
        await addDoc(collection(db, 'reviews'), {
          userId: user.uid,
          username: user.email ? user.email.split('@')[0] : 'pilot',
          ...fields,
          likesCount: 0,
          commentsCount: 0,
          syncStatus: 'pending',
          createdAt: serverTimestamp(),
        });
        const newlyEarned = await checkForNewBadges(fields);
        haptics.success();
        if (newlyEarned.length > 0) {
          // Show the unlock card first (only the first if several unlocked
          // at once) — onDone() is deferred until it's closed, since it
          // navigates away and would unmount this screen (and the overlay
          // with it) immediately.
          setUnlockedBadge(newlyEarned[0]);
        } else {
          onDone();
        }
      }
    } catch (e) {
      toast.error('Could not save', e.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isEditing && <ScreenHeader title="Edit flight" onBack={onBack} />}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
      {!isEditing && (
        <Text style={{ fontSize: 18, fontWeight: '500', color: colors.textPrimary, marginBottom: 16 }}>
          Log a flight
        </Text>
      )}

      <SearchableField
        placeholder="Airline"
        value={airline}
        onChangeText={setAirline}
        options={COMMON_AIRLINES}
        getLabel={(a) => a.name}
        getSubtitle={(a) => a.code}
      />

      <TextInput
        placeholder="Flight number (optional)"
        placeholderTextColor={colors.textMuted}
        value={flightNumber}
        onChangeText={setFlightNumber}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: 14,
          marginBottom: 10,
          color: colors.textPrimary,
          backgroundColor: colors.surface,
        }}
      />

      <TextInput
        placeholder="DD\MM\YYYY"
        placeholderTextColor={colors.textMuted}
        value={date}
        onChangeText={(text) => setDate(formatDateInput(text))}
        keyboardType="number-pad"
        maxLength={10}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: 14,
          marginBottom: 10,
          color: colors.textPrimary,
          backgroundColor: colors.surface,
        }}
      />

      <SearchableField
        placeholder="Departure airport (e.g. JFK)"
        value={departureAirport}
        onChangeText={setDepartureAirport}
        options={AIRPORTS}
        getLabel={(a) => a.code}
        getSubtitle={(a) => `${a.name}, ${a.city}`}
        getSearchText={(a) => `${a.code} ${a.name} ${a.city}`}
      />

      <SearchableField
        placeholder="Arrival airport (e.g. LHR)"
        value={arrivalAirport}
        onChangeText={setArrivalAirport}
        options={AIRPORTS}
        getLabel={(a) => a.code}
        getSubtitle={(a) => `${a.name}, ${a.city}`}
        getSearchText={(a) => `${a.code} ${a.name} ${a.city}`}
      />

      <SearchableField
        placeholder="Aircraft type (e.g. Boeing 777-300ER)"
        value={aircraftType}
        onChangeText={setAircraftType}
        options={COMMON_AIRCRAFT}
        getLabel={(a) => a.label}
      />

      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Class</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
        {CABIN_CLASSES.map((level) => (
          <Pressable
            key={level}
            onPress={() => setCabinClass(level)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: cabinClass === level ? colors.accentFill : colors.surface,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '500',
                color: cabinClass === level ? colors.onAccentFill : colors.textSecondary,
                textAlign: 'center',
              }}
            >
              {level}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        placeholder="Caption (optional)"
        placeholderTextColor={colors.textMuted}
        value={reviewText}
        onChangeText={setReviewText}
        multiline
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: 14,
          minHeight: 60,
          marginBottom: 16,
          color: colors.textPrimary,
          backgroundColor: colors.surface,
          textAlignVertical: 'top',
        }}
      />

      <TextInput
        placeholder="What was the meal? (optional)"
        placeholderTextColor={colors.textMuted}
        value={mealDescription}
        onChangeText={setMealDescription}
        multiline
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: 14,
          minHeight: 44,
          marginBottom: 16,
          color: colors.textPrimary,
          backgroundColor: colors.surface,
          textAlignVertical: 'top',
        }}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {PHOTO_CATEGORIES.map((cat) => {
          const existing = photos.find((p) => p.category === cat.key);
          return (
            <Pressable
              key={cat.key}
              onPress={() => pickPhoto(cat.key)}
              style={{
                width: 72,
                height: 72,
                borderRadius: 10,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {existing ? (
                <Image source={{ uri: existing.url }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={18} color={colors.textMuted} />
                  <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>{cat.label}</Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ fontSize: 14, color: colors.textPrimary }}>Free alcohol</Text>
        <Switch value={freeAlcohol} onValueChange={setFreeAlcohol} trackColor={{ true: colors.accentFill }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasWifi ? 10 : 14 }}>
        <Text style={{ fontSize: 14, color: colors.textPrimary }}>Wifi</Text>
        <Switch value={hasWifi} onValueChange={setHasWifi} trackColor={{ true: colors.accentFill }} />
      </View>

      {hasWifi && (
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
          {WIFI_LEVELS.map((level) => (
            <Pressable
              key={level}
              onPress={() => setWifiQuality(level)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: wifiQuality === level ? colors.accentFill : colors.surface,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '500',
                  color: wifiQuality === level ? colors.onAccentFill : colors.textSecondary,
                  textAlign: 'center',
                }}
              >
                {level}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />

      {RATING_CATEGORIES.map((cat) => (
        <RatingBar
          key={cat.key}
          label={cat.label}
          emoji={cat.emoji}
          description={cat.description}
          value={ratings[cat.key]}
          onChange={(v) => setRating(cat.key, v)}
          allowNA={cat.allowNA}
          isNA={naFlags[cat.key]}
          onToggleNA={cat.allowNA ? () => toggleNA(cat.key) : undefined}
        />
      ))}

      {/* Bag allowance isn't a drag-bar like the categories above — see
          utils/ratingMeta.js for why (discrete tiers fit it better than a
          0-5 continuum). Header row matches RatingBar's layout for visual
          consistency; the picker below reuses the same 4-way chip pattern
          as the wifi-quality/cabin-class pickers elsewhere on this form. */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Pressable
            onPress={() => toast.info(`${BAG_ALLOWANCE.emoji} ${BAG_ALLOWANCE.label}`, BAG_ALLOWANCE.description)}
            hitSlop={8}
          >
            <Text style={{ fontSize: 20 }}>{BAG_ALLOWANCE.emoji}</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => toggleNA('bagAllowance')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons
                name={naFlags.bagAllowance ? 'checkbox' : 'square-outline'}
                size={16}
                color={naFlags.bagAllowance ? colors.accentFill : colors.textMuted}
              />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>N/A</Text>
            </Pressable>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.accentText, minWidth: 60, textAlign: 'right' }}>
              {naFlags.bagAllowance ? 'N/A' : bagAllowance}
            </Text>
          </View>
        </View>

        {naFlags.bagAllowance ? (
          <View style={{ height: 32, justifyContent: 'center' }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, opacity: 0.4 }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {BAG_ALLOWANCE_LEVELS.map((level) => (
              <Pressable
                key={level}
                onPress={() => setBagAllowance(level)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: bagAllowance === level ? colors.accentFill : colors.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '500',
                    color: bagAllowance === level ? colors.onAccentFill : colors.textSecondary,
                    textAlign: 'center',
                  }}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>
        Overall rating is the average of food, seat comfort, crew, and multimedia (skipping any marked N/A) — bag allowance is shown separately and doesn't count toward it.
      </Text>

      <Pressable
        onPress={submit}
        disabled={busy}
        style={{
          backgroundColor: colors.accentFill,
          paddingVertical: 14,
          borderRadius: 10,
          alignItems: 'center',
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Text style={{ color: colors.onAccentFill, fontSize: 16, fontWeight: '500' }}>
          {busy ? 'Saving...' : isEditing ? 'Save changes' : 'Post flight review'}
        </Text>
      </Pressable>
      </ScrollView>

      {unlockedBadge && (
        <ShareCardOverlay
          variant="badge"
          badge={unlockedBadge}
          onClose={() => {
            setUnlockedBadge(null);
            onDone();
          }}
        />
      )}
    </View>
  );
}
