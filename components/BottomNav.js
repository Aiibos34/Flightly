import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

const TABS = [
  { key: 'feed', icon: 'home', outlineIcon: 'home-outline' },
  { key: 'search', icon: 'search', outlineIcon: 'search-outline' },
  { key: 'newReview', icon: 'add', outlineIcon: 'add' },
  { key: 'badges', icon: 'trophy', outlineIcon: 'trophy-outline' },
  { key: 'profile', icon: 'person', outlineIcon: 'person-outline' },
];

export default function BottomNav({ active, onChange }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;

        if (tab.key === 'newReview') {
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: colors.accentFill,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="add" size={20} color={colors.onAccentFill} />
            </Pressable>
          );
        }

        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)}>
            <Ionicons
              name={isActive ? tab.icon : tab.outlineIcon}
              size={22}
              color={isActive ? colors.accentText : colors.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
