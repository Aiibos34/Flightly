import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, Switch, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, doc, addDoc, updateDoc, serverTimestamp, getDocs, query, where } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import RatingBar from '../components/RatingBar';
import ScreenHeader from '../components/ScreenHeader';
import ShareCardOverlay from '../components/ShareCardOverlay';
import { syncEarnedBadges } from '../utils/badges';

const PHOTO_CATEGORIES = [
  { key: 'aircraft', label: 'Aircraft' },
  { key: 'cabin', label: 'Cabin' },
  { key: 'seat', label: 'Seat' },
  { key: 'food', label: 'Food' },
  { key: 'alcohol', label: 'Alcohol' },
];

const WIFI_LEVELS = ['unusable', 'not bad', 'good', 'excellent'];

const snapToQuarter = (v) => Math.round(v * 4) / 4;

export default function NewFlightReviewScreen({ user, onDone, editingReview, onBack }) {
  const { colors } = useTheme();
  const isEditing = !!editingReview;

  const [photos, setPhotos] = useState(editingReview?.photos ?? []); // { url, category }
  const [reviewText, setReviewText] = useState(editingReview?.reviewText ?? '');
  const [airline, setAirline] = useState(editingReview?.airline ?? '');
  const [flightNumber, setFlightNumber] = useState(editingReview?.flightNumber ?? '');
  const [date, setDate] = useState(editingReview?.date ?? '');
  const [departureAirport, setDepartureAirport] = useState(editingReview?.departureAirport ?? '');
  const [arrivalAirport, setArrivalAirport] = useState(editingReview?.arrivalAirport ?? '');
  const [aircraftType, setAircraftType] = useState(editingReview?.aircraftType ?? '');
  const [freeAlcohol, setFreeAlcohol] = useState(editingReview?.freeAlcohol ?? false);
  const [hasWifi, setHasWifi] = useState(editingReview?.hasWifi ?? false);
  const [wifiQuality, setWifiQuality] = useState(editingReview?.wifiQuality || WIFI_LEVELS[2]);
  const [ratings, setRatings] = useState({
    food: editingReview?.ratings?.food ?? 2.5,
    seatComfort: editingReview?.ratings?.seatComfort ?? 2.5,
    flightAttendants: editingReview?.ratings?.flightAttendants ?? 2.5,
    multimedia: editingReview?.ratings?.multimedia ?? 2.5,
  });
  const [busy, setBusy] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState(null);

  const setRating = (key, value) => setRatings((prev) => ({ ...prev, [key]: value }));

  const pickPhoto = async (category) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach a review photo.');
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
      Alert.alert('Missing info', 'Add at least the airline and route before submitting.');
      return;
    }
    if (!firebaseReady) {
      Alert.alert('Firebase not configured', 'Add your Firebase config to .env to save reviews.');
      return;
    }
    setBusy(true);
    try {
      const overall = snapToQuarter(
        (ratings.food + ratings.seatComfort + ratings.flightAttendants + ratings.multimedia) / 4
      );
      const fields = {
        airline,
        flightNumber: flightNumber || null,
        date: date || null,
        departureAirport: departureAirport.toUpperCase(),
        arrivalAirport: arrivalAirport.toUpperCase(),
        aircraftType,
        ratings: { ...ratings, overall },
        freeAlcohol,
        hasWifi,
        wifiQuality: hasWifi ? wifiQuality : null,
        reviewText,
        photos,
      };
      if (isEditing) {
        await updateDoc(doc(db, 'reviews', editingReview.id), fields);
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
      Alert.alert('Could not save', e.message ?? 'Something went wrong.');
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

      {[
        ['Airline', airline, setAirline],
        ['Flight number (optional)', flightNumber, setFlightNumber],
        ['Date', date, setDate],
        ['Departure airport (e.g. JFK)', departureAirport, setDepartureAirport],
        ['Arrival airport (e.g. LHR)', arrivalAirport, setArrivalAirport],
        ['Aircraft type (e.g. Boeing 777-300ER)', aircraftType, setAircraftType],
      ].map(([placeholder, value, setter]) => (
        <TextInput
          key={placeholder}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={setter}
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
      ))}

      <TextInput
        placeholder="Caption"
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

      <RatingBar label="Food" value={ratings.food} onChange={(v) => setRating('food', v)} />
      <RatingBar label="Seat comfort" value={ratings.seatComfort} onChange={(v) => setRating('seatComfort', v)} />
      <RatingBar label="Flight attendants" value={ratings.flightAttendants} onChange={(v) => setRating('flightAttendants', v)} />
      <RatingBar label="Multimedia" value={ratings.multimedia} onChange={(v) => setRating('multimedia', v)} />

      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>
        Overall rating is the average of the four above, shown on your post.
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
