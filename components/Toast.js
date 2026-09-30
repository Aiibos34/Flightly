import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { haptics } from '../utils/haptics';

// Replaces RN's Alert.alert everywhere in the app — Alert draws the OS's own
// plain popup, which looks like it belongs to a different app than the rest
// of Flightly's navy/gold styling. This renders as an in-app banner instead,
// dropped from the top, in the same "plain absolute-positioned View" family
// as ShareCardOverlay (no RN Modal — see PLANNING.md for why).
const AUTO_DISMISS_MS = 3200;
const ICONS = { info: 'information-circle', success: 'checkmark-circle', error: 'alert-circle' };

const ToastContext = createContext({ showToast: () => {} });

export function ToastProvider({ children }) {
  const { colors } = useTheme();
  const [toast, setToast] = useState(null); // { title, message, type }
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef(null);

  const hide = useCallback(() => {
    Animated.timing(translateY, { toValue: -120, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
  }, [translateY, opacity]);

  const showToast = useCallback(
    (title, message, type = 'info') => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      setToast({ title, message, type });
      translateY.setValue(-120);
      opacity.setValue(0);
      if (type === 'error') haptics.error();
      else if (type === 'success') haptics.success();
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      dismissTimer.current = setTimeout(hide, AUTO_DISMISS_MS);
    },
    [translateY, opacity, hide]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity, transform: [{ translateY }] }}
        >
          <Pressable
            onPress={hide}
            style={{
              marginTop: 54,
              marginHorizontal: 16,
              backgroundColor: colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: 12,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
          >
            <Ionicons
              name={ICONS[toast.type] || ICONS.info}
              size={20}
              color={toast.type === 'error' ? '#E24B4A' : colors.accentText}
              style={{ marginTop: 1 }}
            />
            <View style={{ flex: 1 }}>
              {!!toast.title && (
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{toast.title}</Text>
              )}
              {!!toast.message && (
                <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: toast.title ? 2 : 0, lineHeight: 17 }}>
                  {toast.message}
                </Text>
              )}
            </View>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const { showToast } = useContext(ToastContext);
  return {
    info: (title, message) => showToast(title, message, 'info'),
    success: (title, message) => showToast(title, message, 'success'),
    error: (title, message) => showToast(title, message, 'error'),
  };
}
