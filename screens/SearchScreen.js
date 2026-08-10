import { useEffect, useState } from 'react';
import { FlatList, View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import { timeAgo } from '../utils/timeAgo';

export default function SearchScreen({ onOpenReview }) {
  const { colors } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!firebaseReady) return;
    // Fetches all reviews and filters client-side — fine at this scale,
    // and avoids needing a real search service (Algolia etc.) or Firestore's
    // limited prefix-only text queries for Phase 1.
    const unsubscribe = onSnapshot(collection(db, 'reviews'), (snap) => {
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  const needle = searchText.trim().toLowerCase();
  const results = needle
    ? reviews.filter((r) =>
        [r.username, r.airline, r.departureAirport, r.arrivalAirport, r.aircraftType]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(needle))
      )
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '500', color: colors.textPrimary, marginBottom: 16, paddingHorizontal: 16 }}>
        Search
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: colors.surface,
          borderRadius: 10,
          paddingHorizontal: 12,
          marginHorizontal: 16,
          marginBottom: 12,
        }}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search people, airlines, airports"
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, paddingVertical: 10, color: colors.textPrimary }}
        />
      </View>

      {!needle ? (
        <Text style={{ color: colors.textMuted, fontSize: 13, paddingHorizontal: 16 }}>
          Start typing to search across pilots, airlines, and airports.
        </Text>
      ) : results.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 13, paddingHorizontal: 16 }}>
          No matches for "{searchText}".
        </Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onOpenReview(item.id)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>
                {item.username || 'pilot'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {item.airline} · {item.departureAirport} → {item.arrivalAirport} · {timeAgo(item.createdAt)}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
