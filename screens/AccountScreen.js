import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '@firebase/auth';
import { auth } from '../firebase';
import { useTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';

export default function AccountScreen({ onBack, onOpenHistory }) {
  const { colors, mode, toggleTheme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Account" onBack={onBack} />
      <View style={{ padding: 16 }}>
        <Text
          style={{
            fontSize: 11,
            color: colors.textMuted,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Display
        </Text>
        <Pressable
          onPress={toggleTheme}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            marginBottom: 24,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 14 }}>Theme</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{mode === 'dark' ? 'Dark' : 'Light'}</Text>
        </Pressable>

        <Pressable
          onPress={onOpenHistory}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 14 }}>Flight history</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <Pressable onPress={() => signOut(auth)} style={{ paddingVertical: 16, marginTop: 32 }}>
          <Text style={{ color: '#E24B4A', fontSize: 14, textAlign: 'center', fontWeight: '500' }}>
            Sign out
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
