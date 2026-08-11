import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import { BADGES, syncEarnedBadges } from '../utils/badges';

export default function BadgesScreen({ user }) {
  const { colors } = useTheme();
  const [earnedKeys, setEarnedKeys] = useState(new Set());

  useEffect(() => {
    if (!firebaseReady) return;
    const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'badges'), (snap) => {
      setEarnedKeys(new Set(snap.docs.map((d) => d.id)));
    });
    return unsubscribe;
  }, [user.uid]);

  useEffect(() => {
    if (!firebaseReady) return;
    // Re-check on every reviews change, not just on submit — catches anyone
    // who qualified before this feature existed, and is a harmless no-op
    // (syncEarnedBadges skips the write) once everything's already earned.
    const q = query(collection(db, 'reviews'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      syncEarnedBadges(user.uid, snap.docs.map((d) => d.data())).catch(() => {});
    });
    return unsubscribe;
  }, [user.uid]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '500', color: colors.textPrimary }}>Badges</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
          {earnedKeys.size} of {BADGES.length} earned
        </Text>
      </View>
      <FlatList
        data={BADGES}
        keyExtractor={(b) => b.key}
        numColumns={3}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24 }}
        renderItem={({ item }) => {
          const earned = earnedKeys.has(item.key);
          return (
            <Pressable
              onPress={() => Alert.alert(item.title, item.description)}
              style={{ width: '33.33%', padding: 8, alignItems: 'center' }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: earned ? colors.accentFill : colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: earned ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Ionicons name={item.icon} size={26} color={earned ? colors.onAccentFill : colors.textMuted} />
              </View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  color: earned ? colors.textPrimary : colors.textMuted,
                  textAlign: 'center',
                  marginTop: 6,
                }}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
