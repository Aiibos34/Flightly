import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// The app has no navigation library (App.js swaps screens via plain state —
// see PLANNING.md), so React Navigation's built-in push/pop transitions
// aren't available. This wraps each screen with a mount-triggered fade +
// gentle rise so switching screens/tabs doesn't hard-cut, without touching
// the manual navigation logic itself.
export default function ScreenTransition({ children }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}
