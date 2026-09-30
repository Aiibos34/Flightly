import { useRef, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { haptics } from '../utils/haptics';
import { likeReview } from '../utils/likes';

const HEIGHT = 240;
const HORIZONTAL_INSET = 32; // matches the 16px padding on each side of the card/screen
const DOUBLE_TAP_MS = 300;

// reviewId/userId are optional — when omitted (no caller currently does,
// but kept defensive), double-tap-to-like is simply a no-op instead of
// throwing, same as LikeButton's own guard against a missing userId.
export default function PhotoCarousel({ photos, reviewId, userId }) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const itemWidth = windowWidth - HORIZONTAL_INSET;
  const lastTapRef = useRef(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  if (!photos || photos.length === 0) {
    return (
      <View
        style={{
          width: '100%',
          height: HEIGHT,
          borderRadius: 12,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons name="image-outline" size={28} color={colors.textMuted} />
      </View>
    );
  }

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / itemWidth);
    setActiveIndex(idx);
  };

  const pulseHeart = () => {
    heartScale.setValue(0.3);
    heartOpacity.setValue(1);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.delay(450),
      Animated.timing(heartOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  // Plain Pressable (not react-native-gesture-handler) deliberately — this
  // sits inside a horizontal ScrollView, and RN's built-in responder system
  // already negotiates tap-vs-swipe correctly here on its own (a Pressable's
  // press doesn't fire once the touch has moved past the drag threshold, so
  // the ScrollView's paging isn't affected). Gesture Handler's lower-level
  // API is what needed the special nested-Pressable workarounds documented
  // elsewhere in this app (RatingBar, StoryViewerScreen) — this case doesn't.
  const handlePhotoTap = () => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < DOUBLE_TAP_MS;
    if (!isDoubleTap) {
      lastTapRef.current = now;
      return;
    }
    lastTapRef.current = 0; // reset so a quick triple-tap doesn't fire again on the 3rd tap
    haptics.tap();
    pulseHeart();
    likeReview(reviewId, userId).catch(() => {});
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={{ width: itemWidth, borderRadius: 12 }}
      >
        {photos.map((photo, i) => (
          <Pressable
            key={`${photo.category}-${i}`}
            onPress={handlePhotoTap}
            style={{ width: itemWidth, height: HEIGHT, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface }}
          >
            <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
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
              <Text style={{ fontSize: 10, color: '#fff', textTransform: 'capitalize' }}>{photo.category}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: heartOpacity,
          transform: [{ scale: heartScale }],
        }}
      >
        <Ionicons name="heart" size={84} color="#fff" style={{ opacity: 0.95 }} />
      </Animated.View>

      {photos.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 6 }}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: i === activeIndex ? colors.accentFill : colors.border,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
