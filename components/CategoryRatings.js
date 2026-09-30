import { Pressable, View, Text } from 'react-native';
import { useTheme } from '../theme';
import { useToast } from './Toast';
import { RATING_CATEGORIES, BAG_ALLOWANCE } from '../utils/ratingMeta';

// Emoji rendered at 16 to match the overall-rating star icon size used on
// both ReviewCard and FlightReviewDetailScreen.
const EMOJI_SIZE = 16;

// wifi/class/free-alcohol previously had no onPress or description at all —
// only the 5 rating categories got tap-to-reveal when that was added, so
// tapping these three silently did nothing. Fixed by giving them the same
// treatment here.
const INFO_META = {
  freeAlcohol: { emoji: '🍷', label: 'free alcohol', description: 'Whether alcoholic drinks were included at no extra charge.' },
  wifi: { emoji: '📶', label: 'wifi', description: 'Wifi availability and connection quality onboard.' },
  class: { emoji: '🎟️', label: 'class', description: 'Cabin class flown for this segment.' },
};

export default function CategoryRatings({ ratings, freeAlcohol, hasWifi, wifiQuality, cabinClass }) {
  const { colors } = useTheme();
  const toast = useToast();

  const ratingCells = RATING_CATEGORIES.map((c) => {
    const raw = ratings?.[c.key];
    return {
      key: c.key,
      emoji: c.emoji,
      label: c.label.toLowerCase(),
      value: raw == null ? 'N/A' : Number(raw).toFixed(2),
      onPress: () => toast.info(`${c.emoji} ${c.label}`, c.description),
    };
  });

  const bagValue = ratings?.bagAllowance;
  const bagCell = {
    key: 'bagAllowance',
    emoji: BAG_ALLOWANCE.emoji,
    label: BAG_ALLOWANCE.label.toLowerCase(),
    value: bagValue == null ? 'N/A' : bagValue,
    onPress: () => toast.info(`${BAG_ALLOWANCE.emoji} ${BAG_ALLOWANCE.label}`, BAG_ALLOWANCE.description),
  };

  const infoCells = [
    { key: 'freeAlcohol', ...INFO_META.freeAlcohol, value: freeAlcohol ? 'yes' : 'no' },
    { key: 'wifi', ...INFO_META.wifi, value: hasWifi ? wifiQuality || 'yes' : 'no' },
    ...(cabinClass ? [{ key: 'class', ...INFO_META.class, value: cabinClass }] : []),
  ].map((c) => ({ ...c, onPress: () => toast.info(`${c.emoji} ${c.label}`, c.description) }));

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      {[...ratingCells, bagCell, ...infoCells].map((cell) => (
        <Pressable
          key={cell.key}
          onPress={cell.onPress}
          style={{
            width: '47%',
            backgroundColor: colors.surface,
            borderRadius: 8,
            paddingVertical: 6,
            paddingHorizontal: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <Text style={{ fontSize: EMOJI_SIZE, lineHeight: EMOJI_SIZE + 2 }}>{cell.emoji}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>{cell.label}</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textPrimary }}>
            {cell.value}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
