import { Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function ScreenHeader({ title, onBack, right }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
        )}
        <Text style={{ fontSize: 16, fontWeight: '500', color: colors.textPrimary }}>{title}</Text>
      </View>
      {right}
    </View>
  );
}
