import { useEffect, useState } from 'react';
import { FlatList, View, Text, Pressable } from 'react-native';
import { collection, query, where, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';

const TITLES = { airports: 'Airports', airlines: 'Airlines' };
const EMPTY_ICONS = { airports: 'location-outline', airlines: 'briefcase-outline' };
const EMPTY_MESSAGES = {
  airports: 'No airports flown to or from yet.',
  airlines: 'No airlines logged yet.',
};

// Aggregates the already-fetched reviews client-side rather than a separate
// Firestore query — same data FollowListScreen-style flows already load,
// just grouped into unique airports/airlines with a flight count each.
function buildItems(type, reviews) {
  const counts = new Map();
  for (const r of reviews) {
    const keys = type === 'airports' ? [r.departureAirport, r.arrivalAirport] : [r.airline];
    for (const key of keys) {
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export default function StatListScreen({ user, profileUserId, type, onBack, onOpenDetail }) {
  const { colors } = useTheme();
  const targetUserId = profileUserId || user.uid;
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'reviews'), where('userId', '==', targetUserId));
    const unsubscribe = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [targetUserId]);

  const items = buildItems(type, reviews);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={TITLES[type] || type} onBack={onBack} />
      {items.length === 0 ? (
        <EmptyState icon={EMPTY_ICONS[type] || 'airplane-outline'} title={EMPTY_MESSAGES[type] || 'Nothing to show yet'} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onOpenDetail(type, item.label)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>{item.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                {item.count} flight{item.count === 1 ? '' : 's'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
