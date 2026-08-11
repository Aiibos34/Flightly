import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Deliberately fixed navy/gold colors rather than useTheme() — a shared
// image should always read as on-brand, regardless of the viewer's device
// theme, the same way it wouldn't make sense for a Spotify Wrapped card to
// change color scheme based on your phone's dark mode.
const BG = '#0B1830';
const SURFACE = '#16264A';
const GOLD = '#F0B429';
const TEXT = '#F2F5FA';
const MUTED = '#9FB2CC';

export default function ShareCard({ variant, review, badge }) {
  return (
    <View style={{ width: 320, backgroundColor: BG, borderRadius: 20, padding: 24 }}>
      <Text style={{ color: GOLD, fontSize: 15, fontWeight: '700', letterSpacing: 1, marginBottom: 24 }}>
        flightly
      </Text>

      {variant === 'review' && review && (
        <>
          <Text style={{ color: TEXT, fontSize: 24, fontWeight: '700', marginBottom: 4 }}>
            {review.departureAirport} → {review.arrivalAirport}
          </Text>
          <Text style={{ color: MUTED, fontSize: 13, marginBottom: 24 }}>
            {review.airline}
            {review.aircraftType ? ` · ${review.aircraftType}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
            <Ionicons name="star" size={22} color={GOLD} />
            <Text style={{ color: GOLD, fontSize: 34, fontWeight: '700' }}>
              {review.ratings?.overall?.toFixed(2) ?? '—'}
            </Text>
            <Text style={{ color: MUTED, fontSize: 13 }}>overall</Text>
          </View>
        </>
      )}

      {variant === 'badge' && badge && (
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: GOLD,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <Ionicons name={badge.icon} size={40} color={BG} />
          </View>
          <Text style={{ color: MUTED, fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Badge unlocked
          </Text>
          <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>{badge.title}</Text>
          <Text style={{ color: MUTED, fontSize: 12, textAlign: 'center', marginTop: 6 }}>{badge.description}</Text>
        </View>
      )}

      <View style={{ height: 1, backgroundColor: SURFACE, marginTop: 24, marginBottom: 12 }} />
      <Text style={{ color: MUTED, fontSize: 10, textAlign: 'center' }}>Log your flights on flightly</Text>
    </View>
  );
}
