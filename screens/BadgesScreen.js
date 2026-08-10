import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

// Badges/achievements are a Phase 2 feature per PLANNING.md — this is a
// placeholder so the bottom-nav tab has somewhere to go in Phase 1.
export default function BadgesScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Ionicons name="trophy-outline" size={32} color={colors.textMuted} style={{ marginBottom: 12 }} />
      <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
        Badges and achievements are coming in a later phase, once the core review loop is live.
      </Text>
    </View>
  );
}
