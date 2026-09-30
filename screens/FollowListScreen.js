import { useEffect, useState } from 'react';
import { FlatList, View, Text, Pressable } from 'react-native';
import { collection, doc, getDoc, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';

const TITLES = { followers: 'Followers', following: 'Following' };

export default function FollowListScreen({ userId, type, onBack, onOpenProfile }) {
  const { colors } = useTheme();
  const [people, setPeople] = useState([]);

  useEffect(() => {
    if (!firebaseReady) return;
    // Each doc in the subcollection is keyed by the other user's uid and
    // carries { userId }; resolve those into displayable profiles.
    const unsubscribe = onSnapshot(collection(db, 'users', userId, type), async (snap) => {
      const ids = snap.docs.map((d) => d.id);
      const profiles = await Promise.all(
        ids.map(async (id) => {
          const userSnap = await getDoc(doc(db, 'users', id));
          return { id, ...userSnap.data() };
        })
      );
      setPeople(profiles);
    });
    return unsubscribe;
  }, [userId, type]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={TITLES[type] || type} onBack={onBack} />
      {people.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
        />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onOpenProfile(item.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.avatarPlaceholders[0],
                  overflow: 'hidden',
                }}
              />
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>
                {item.username || 'pilot'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
