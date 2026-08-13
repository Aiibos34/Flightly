import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import CategoryRatings from '../components/CategoryRatings';
import LikeButton from '../components/LikeButton';
import PhotoCarousel from '../components/PhotoCarousel';
import ShareCardOverlay from '../components/ShareCardOverlay';
import { timeAgo } from '../utils/timeAgo';
import { getAircraftPhotoUrl } from '../utils/aircraftPhoto';
import { distanceBetween } from '../utils/airportInfo';

export default function FlightReviewDetailScreen({
  reviewId,
  user,
  onBack,
  onOpenComments,
  onOpenProfile,
  onEditReview,
  onOpenAirport,
  onOpenAirline,
}) {
  const { colors } = useTheme();
  const [review, setReview] = useState(null);
  const [showAircraftPhoto, setShowAircraftPhoto] = useState(false);
  const [genericAircraftPhoto, setGenericAircraftPhoto] = useState(null);
  const [showShareCard, setShowShareCard] = useState(false);

  useEffect(() => {
    if (!firebaseReady) return;
    const unsubscribe = onSnapshot(doc(db, 'reviews', reviewId), (snap) => {
      if (snap.exists()) setReview({ id: snap.id, ...snap.data() });
    });
    return unsubscribe;
  }, [reviewId]);

  const aircraftPhotoFromReview = review?.photos?.find((p) => p.category === 'aircraft');

  useEffect(() => {
    if (!showAircraftPhoto || aircraftPhotoFromReview || !review?.aircraftType) return;
    let cancelled = false;
    getAircraftPhotoUrl(review.aircraftType).then((url) => {
      if (!cancelled) setGenericAircraftPhoto(url);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAircraftPhoto, review?.aircraftType]);

  if (!review) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Flight review" onBack={onBack} />
      </View>
    );
  }

  const aircraftPhoto = aircraftPhotoFromReview;
  const distanceKm = distanceBetween(review.departureAirport, review.arrivalAirport);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={`${review.departureAirport} → ${review.arrivalAirport}`}
        onBack={onBack}
        right={
          review.userId === user.uid ? (
            <Pressable onPress={() => onEditReview(review)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={20} color={colors.textPrimary} />
            </Pressable>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Pressable onPress={() => onOpenProfile(review.userId)}>
          <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 2 }}>
            {review.username || 'pilot'}
          </Text>
        </Pressable>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
          <Text onPress={() => onOpenAirline(review.airline)} style={{ textDecorationLine: 'underline' }}>
            {review.airline}
          </Text>
          {review.flightNumber ? ` · ${review.flightNumber} ` : ' '}· {timeAgo(review.createdAt)}
        </Text>

        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
          <Text onPress={() => onOpenAirport(review.departureAirport)} style={{ textDecorationLine: 'underline' }}>
            {review.departureAirport}
          </Text>
          {'  →  '}
          <Text onPress={() => onOpenAirport(review.arrivalAirport)} style={{ textDecorationLine: 'underline' }}>
            {review.arrivalAirport}
          </Text>
          {distanceKm ? `   ·   ${distanceKm} km` : ''}
        </Text>

        <PhotoCarousel photos={review.photos} />

        <Pressable onPress={() => setShowAircraftPhoto((v) => !v)} style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.accentText, fontSize: 14, textDecorationLine: 'underline' }}>
            {review.aircraftType || 'Aircraft not specified'}
          </Text>
        </Pressable>

        {showAircraftPhoto && (
          <View
            style={{
              width: '100%',
              height: 150,
              borderRadius: 12,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            {aircraftPhoto ? (
              <Image source={{ uri: aircraftPhoto.url }} style={{ width: '100%', height: '100%' }} />
            ) : genericAircraftPhoto ? (
              <>
                <Image source={{ uri: genericAircraftPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: 10, color: '#fff' }}>reference photo, via Wikipedia</Text>
                </View>
              </>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: 12, paddingHorizontal: 20, textAlign: 'center' }}>
                No aircraft photo for this review, and no reference photo found for "
                {review.aircraftType || 'this aircraft'}".
              </Text>
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
          <Ionicons name="star" size={18} color={colors.accentText} />
          <Text style={{ fontSize: 22, fontWeight: '500', color: colors.accentText }}>
            {review.ratings.overall.toFixed(2)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>overall</Text>
        </View>

        <CategoryRatings
          ratings={review.ratings}
          freeAlcohol={review.freeAlcohol}
          hasWifi={review.hasWifi}
          wifiQuality={review.wifiQuality}
          cabinClass={review.cabinClass}
        />

        {!!review.reviewText && (
          <Text style={{ color: colors.textPrimary, fontSize: 14, marginBottom: 16, lineHeight: 20 }}>
            {review.reviewText}
          </Text>
        )}

        {!!review.mealDescription && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              Meal
            </Text>
            <Text style={{ color: colors.textPrimary, fontSize: 14, lineHeight: 20 }}>{review.mealDescription}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 4 }}>
          <LikeButton reviewId={review.id} userId={user.uid} likesCount={review.likesCount} />
          <Pressable
            onPress={() => onOpenComments(review.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{review.commentsCount}</Text>
          </Pressable>
          <Pressable onPress={() => setShowShareCard(true)} hitSlop={8}>
            <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>

      {showShareCard && (
        <ShareCardOverlay variant="review" review={review} onClose={() => setShowShareCard(false)} />
      )}
    </View>
  );
}
