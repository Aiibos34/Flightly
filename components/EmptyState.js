import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

// A designed placeholder for "no data yet" screens — swapped in for the
// plain gray Text that used to sit alone on a blank background across most
// list screens. actionLabel/onAction are optional; screens that don't have
// an obvious next step (or a wired-up navigation callback) just omit them.
export default function EmptyState({ icon = 'airplane-outline', title, subtitle, actionLabel, onAction }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: '18%' }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={28} color={colors.textMuted} />
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      {!!subtitle && (
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
          {subtitle}
        </Text>
      )}
      {!!actionLabel && !!onAction && (
        <Pressable
          onPress={onAction}
          style={{
            marginTop: 18,
            backgroundColor: colors.accentFill,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: colors.onAccentFill, fontSize: 13, fontWeight: '600' }}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
