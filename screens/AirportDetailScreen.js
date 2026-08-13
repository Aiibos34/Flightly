import { useEffect, useState } from 'react';
import { FlatList, View, Text, Pressable } from 'react-native';
import { collection, query, where, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import { getAirportInfo } from '../utils/airportInfo';

export default function AirportDetailScreen({ user, profileUserId, code, onBack, onOpenReview }) {
  const { colors } = useTheme();
  const targetUserId = profileUserId || user.uid;
  const [reviews, setReviews] = useState([]);
  const info = getAirportInfo(code);

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'reviews'), where('userId', '==', targetUserId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReviews(docs.filter((r) => r.departureAirport === code || r.arrivalAirport === code));
    });
    return unsubscribe;
  }, [targetUserId, code]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={code} onBack={onBack} />
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {info ? (
          <>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600' }}>{info.name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
              {info.city}, {info.country}
            </Text>
          </>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>No airport info available for "{code}".</Text>
        )}
      </View>
      <FlatList
        data={reviews}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={
          reviews.length > 0 ? (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                paddingHorizontal: 16,
                paddingTop: 14,
                paddingBottom: 4,
              }}
            >
              Your flights through {code}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onOpenReview(item.id)}
            style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>
              {item.departureAirport} → {item.arrivalAirport}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{item.airline}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
