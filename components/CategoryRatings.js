import { View, Text } from 'react-native';
import { useTheme } from '../theme';

const CATEGORIES = [
  { key: 'food', label: 'food' },
  { key: 'seatComfort', label: 'seat comfort' },
  { key: 'flightAttendants', label: 'crew' },
  { key: 'multimedia', label: 'multimedia' },
];

export default function CategoryRatings({ ratings, freeAlcohol, hasWifi, wifiQuality, cabinClass }) {
  const { colors } = useTheme();

  const cells = [
    ...CATEGORIES.map((c) => ({ label: c.label, value: (ratings?.[c.key] ?? 0).toFixed(2) })),
    { label: 'free alcohol', value: freeAlcohol ? 'yes' : 'no' },
    { label: 'wifi', value: hasWifi ? wifiQuality || 'yes' : 'no' },
    ...(cabinClass ? [{ label: 'class', value: cabinClass }] : []),
  ];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      {cells.map((cell) => (
        <View
          key={cell.label}
          style={{
            width: '47%',
            backgroundColor: colors.surface,
            borderRadius: 8,
            paddingVertical: 6,
            paddingHorizontal: 10,
          }}
        >
          <Text style={{ fontSize: 10, color: colors.textMuted }}>{cell.label}</Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textPrimary }}>
            {cell.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
