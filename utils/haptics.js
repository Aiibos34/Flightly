import * as Haptics from 'expo-haptics';

// Thin wrappers so call sites read by intent, not by Haptics API shape.
// Every function swallows its own errors — haptics are unsupported on web
// and some Android devices, and a missing buzz should never break a tap.
export const haptics = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  select: () => Haptics.selectionAsync().catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};
