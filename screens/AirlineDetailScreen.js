import { useEffect, useState } from 'react';
import { FlatList, View, Text, Pressable, Image } from 'react-native';
import { collection, query, where, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import { matchAirline, getAirlineLogoUrl } from '../utils/airlineLogo';

export default function AirlineDetailScreen({ user, profileUserId, airline, onBack, onOpenReview }) {
  const { colors } = useTheme();
  const targetUserId = profileUserId || user.uid;
  const [reviews, setReviews] = useState([]);
  const matched = matchAirline(airline);

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'reviews'), where('userId', '==', targetUserId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReviews(docs.filter((r) => r.airline === airline));
    });
    return unsubscribe;
  }, [targetUserId, airline]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={airline} onBack={onBack} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {matched && (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Image source={{ uri: getAirlineLogoUrl(matched.code) }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
        )}
        <View>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600' }}>{matched?.name ?? airline}</Text>
          {matched ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{matched.country}</Text>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>No airline info available.</Text>
          )}
        </View>
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
              Your flights with {airline}
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
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{item.aircraftType}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
