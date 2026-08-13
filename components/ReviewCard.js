import { Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import CategoryRatings from './CategoryRatings';
import LikeButton from './LikeButton';
import PhotoCarousel from './PhotoCarousel';
import CommentsPreview from './CommentsPreview';
import Avatar from './Avatar';
import { timeAgo } from '../utils/timeAgo';

export default function ReviewCard({ review, userId, onPress, onOpenComments, onOpenProfile }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {/* Avatar/username and the route/time line are sibling Pressables, not
          nested — nesting made react-native-web bubble the click to both
          handlers (unlike native's single-responder model), so the outer
          "open review" handler kept winning over the inner "open profile"
          one. Siblings sidestep that ambiguity on any platform. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Pressable
          onPress={() => onOpenProfile(review.userId)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <Avatar userId={review.userId} size={36} />
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textPrimary }}>
            {review.username || 'pilot'}
          </Text>
        </Pressable>
        <Pressable onPress={onPress} style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>
            {review.departureAirport} → {review.arrivalAirport}
            {review.aircraftType ? ` · ${review.aircraftType}` : ''} · {timeAgo(review.createdAt)}
          </Text>
        </Pressable>
      </View>

      {/* Not wrapped in the navigating Pressable above — an ancestor
          Pressable competing for the touch responder is what caused the
          "have to tap before you can swipe" issue on the photo carousel. */}
      <PhotoCarousel photos={review.photos} />

      {!!review.reviewText && (
        <Pressable onPress={onPress} style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            <Text style={{ fontWeight: '500', color: colors.textPrimary }}>{review.username || 'pilot'} </Text>
            {review.reviewText}
          </Text>
        </Pressable>
      )}

      {!!review.mealDescription && (
        <Pressable onPress={onPress} style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>
            <Text style={{ fontWeight: '500' }}>Meal: </Text>
            {review.mealDescription}
          </Text>
        </Pressable>
      )}

      <Pressable onPress={onPress}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 12, marginBottom: 10 }}>
          <Ionicons name="star" size={16} color={colors.accentText} />
          <Text style={{ fontSize: 18, fontWeight: '500', color: colors.accentText }}>
            {review.ratings.overall.toFixed(2)}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>overall</Text>
        </View>

        <CategoryRatings
          ratings={review.ratings}
          freeAlcohol={review.freeAlcohol}
          hasWifi={review.hasWifi}
          wifiQuality={review.wifiQuality}
          cabinClass={review.cabinClass}
        />
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <LikeButton reviewId={review.id} userId={userId} likesCount={review.likesCount} />
        <Pressable
          onPress={() => onOpenComments(review.id)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Ionicons name="chatbubble-outline" size={17} color={colors.textSecondary} />
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{review.commentsCount}</Text>
        </Pressable>
        <Ionicons name="share-outline" size={17} color={colors.textSecondary} />
      </View>

      <CommentsPreview
        reviewId={review.id}
        commentsCount={review.commentsCount}
        onViewAll={() => onOpenComments(review.id)}
      />
    </View>
  );
}
