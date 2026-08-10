import { useEffect, useState } from 'react';
import { FlatList, View, Text, Pressable } from 'react-native';
import { collection, query, where, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';

export default function FlightHistoryScreen({ user, profileUserId, onBack, onOpenReview }) {
  const { colors } = useTheme();
  const targetUserId = profileUserId || user.uid;
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!firebaseReady) return;
    // Sorted client-side rather than via orderBy() in the query — combining
    // a where() filter with orderBy() on a different field needs a Firestore
    // composite index to be created manually. Sorting here avoids that
    // setup step entirely, and a single user's history is small enough
    // that this costs nothing meaningful.
    const q = query(collection(db, 'reviews'), where('userId', '==', targetUserId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setReviews(docs);
    });
    return unsubscribe;
  }, [targetUserId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Flight history" onBack={onBack} />
      {reviews.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {targetUserId === user.uid ? 'Every flight you log will show up here.' : 'No flights logged yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onOpenReview(item.id)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>
                {item.departureAirport} → {item.arrivalAirport}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {item.airline} · {item.aircraftType}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
