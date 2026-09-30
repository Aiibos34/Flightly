import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useTheme } from '../theme';

// A pulsing placeholder box — stands in for content while the first
// Firestore onSnapshot is still resolving, so first load reads as
// "loading" rather than "empty" (which briefly looked identical before).
function Bone({ style }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return <Animated.View style={[{ backgroundColor: colors.surface, borderRadius: 8, opacity: pulse }, style]} />;
}

export function ReviewCardSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Bone style={{ width: 36, height: 36, borderRadius: 18 }} />
        <Bone style={{ width: 120, height: 12 }} />
      </View>
      <Bone style={{ width: '100%', height: 180, borderRadius: 12 }} />
      <Bone style={{ width: '70%', height: 12 }} />
      <Bone style={{ width: '40%', height: 12 }} />
    </View>
  );
}

export function FeedSkeleton() {
  return (
    <View>
      <ReviewCardSkeleton />
      <ReviewCardSkeleton />
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={{ padding: 16, alignItems: 'center' }}>
      <Bone style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 12 }} />
      <Bone style={{ width: 100, height: 14, marginBottom: 20 }} />
      <View style={{ flexDirection: 'row', gap: 32, marginBottom: 24 }}>
        <Bone style={{ width: 48, height: 32 }} />
        <Bone style={{ width: 48, height: 32 }} />
        <Bone style={{ width: 48, height: 32 }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, width: '100%' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Bone key={i} style={{ width: '32.5%', aspectRatio: 1, borderRadius: 0 }} />
        ))}
      </View>
    </View>
  );
}
