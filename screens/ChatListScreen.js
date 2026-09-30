import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View, Text, Pressable } from 'react-native';
import { collection, query, where, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import { timeAgo } from '../utils/timeAgo';
import { hasUnreadMessages } from '../utils/chats';

export default function ChatListScreen({ user, onBack, onOpenChat }) {
  const { colors } = useTheme();
  const [chats, setChats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.lastMessageAt?.toMillis?.() ?? 0) - (a.lastMessageAt?.toMillis?.() ?? 0));
      setChats(docs);
    });
    return unsubscribe;
  }, [user.uid]);

  // Chats are realtime (onSnapshot) — nothing to actually re-fetch, but the
  // pull gesture is still expected here, so it gives brief spinner feedback.
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Messages" onBack={onBack} />
      {chats.length === 0 ? (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="No messages yet"
          subtitle="Replying to someone's story starts a chat."
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentText} colors={[colors.accentText]} />
          }
          renderItem={({ item }) => {
            const otherId = item.participantIds.find((id) => id !== user.uid);
            const otherUsername = item.participantUsernames?.[otherId] || 'pilot';
            const unread = hasUnreadMessages(item, user.uid);
            return (
              <Pressable
                onPress={() => onOpenChat(item.id, otherId, otherUsername)}
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
                <View>
                  <Avatar userId={otherId} size={44} />
                  {unread && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: '#E24B4A',
                        borderWidth: 2,
                        borderColor: colors.background,
                      }}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: colors.textPrimary, fontSize: 14, fontWeight: unread ? '700' : '500' }}
                  >
                    {otherUsername}
                  </Text>
                  <Text
                    style={{ color: unread ? colors.textPrimary : colors.textMuted, fontSize: 12, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {item.lastMessageSenderId === user.uid ? 'You: ' : ''}
                    {item.lastMessage || 'Say hi!'}
                  </Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{timeAgo(item.lastMessageAt)}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
