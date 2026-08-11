import { useRef, useState } from 'react';
import { View, Pressable, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../theme';
import ShareCard from './ShareCard';

// Full-screen absolute-positioned overlay rather than RN's Modal — Modal was
// dropped project-wide after it didn't close reliably on a real device (see
// PLANNING.md), so every overlay here uses this same plain-View pattern.
export default function ShareCardOverlay({ variant, review, badge, onClose }) {
  const { colors } = useTheme();
  const shotRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const uri = await shotRef.current.capture();
      // No Firebase Storage upload — Storage is on hold pending the Blaze
      // plan decision (PLANNING.md), and none is needed: the OS share sheet
      // reads directly from this local file.
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch {
      // best-effort — nothing else to do if capture/share fails
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.72)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24,
      }}
    >
      <Pressable onPress={onClose} hitSlop={10} style={{ position: 'absolute', top: 50, right: 24 }}>
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>

      <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
        <ShareCard variant={variant} review={review} badge={badge} />
      </ViewShot>

      <Pressable
        onPress={share}
        disabled={busy}
        style={{
          marginTop: 28,
          backgroundColor: colors.accentFill,
          paddingVertical: 14,
          paddingHorizontal: 40,
          borderRadius: 10,
          opacity: busy ? 0.6 : 1,
          minWidth: 140,
          alignItems: 'center',
        }}
      >
        {busy ? (
          <ActivityIndicator color={colors.onAccentFill} />
        ) : (
          <Text style={{ color: colors.onAccentFill, fontSize: 15, fontWeight: '500' }}>Share</Text>
        )}
      </Pressable>
    </View>
  );
}
