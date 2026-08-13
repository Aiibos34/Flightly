import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ReviewCard from '../components/ReviewCard';
import Avatar from '../components/Avatar';
import { getViewedStoryIds } from '../utils/storyViews';
import { hasUnreadMessages } from '../utils/chats';

const DAY_MS = 24 * 60 * 60 * 1000;
const CIRCLE_SIZE = 68;
const AVATAR_SIZE = 58;

export default function FeedScreen({ user, onOpenStory, onOpenStoryComposer, onOpenChatList, onOpenReview, onOpenComments, onOpenProfile }) {
  const { colors } = useTheme();
  const [reviews, setReviews] = useState([]);
  const [storyDocs, setStoryDocs] = useState([]);
  const [viewedIds, setViewedIds] = useState(new Set());
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setStoryDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    getViewedStoryIds().then(setViewedIds);
  }, []);

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [user.uid]);

  const hasUnreadChats = chats.some((c) => hasUnreadMessages(c, user.uid));

  // A standalone, camera/gallery-uploaded story — separate from flight
  // reviews. Grouped by user (not deduped to just the latest) so someone
  // with 3 active stories gets 3 progress-bar segments in the viewer, not
  // 1 — one circle per person on the bar, all of their unexpired (< 24h)
  // stories inside it, oldest first. Your own slot always appears (even
  // with zero stories) so the + button has somewhere to live.
  const storyGroups = useMemo(() => {
    const cutoff = Date.now() - DAY_MS;
    const byUser = new Map();
    for (const s of storyDocs) {
      const ms = s.createdAt?.toMillis ? s.createdAt.toMillis() : null;
      if (!ms || ms < cutoff) continue;
      if (!byUser.has(s.userId)) byUser.set(s.userId, []);
      byUser.get(s.userId).push(s);
    }
    for (const list of byUser.values()) {
      list.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    }
    const ownStories = byUser.get(user.uid) ?? [];
    const others = Array.from(byUser.entries()).filter(([uid]) => uid !== user.uid);
    return [
      { id: user.uid, userId: user.uid, username: 'you', stories: ownStories, isOwn: true },
      ...others.map(([uid, list]) => ({ id: uid, userId: uid, username: list[0]?.username || 'pilot', stories: list })),
    ];
  }, [storyDocs, user.uid]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '500', color: colors.accentText }}>flightly</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <Pressable onPress={onOpenChatList} hitSlop={8}>
            <View>
              <Ionicons name="airplane-outline" size={20} color={colors.textPrimary} />
              {hasUnreadChats && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#E24B4A',
                  }}
                />
              )}
            </View>
          </Pressable>
          <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ height: CIRCLE_SIZE + 40 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 16, paddingBottom: 8 }}
      >
        {storyGroups.map((group, i) => {
          const hasStories = group.stories.length > 0;
          const allViewed = hasStories && group.stories.every((s) => viewedIds.has(s.id));
          return (
            <Pressable
              key={group.id}
              onPress={() => hasStories && onOpenStory(storyGroups, i)}
              style={{ alignItems: 'center', gap: 6, width: CIRCLE_SIZE }}
            >
              <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
                <View
                  style={{
                    width: CIRCLE_SIZE,
                    height: CIRCLE_SIZE,
                    borderRadius: CIRCLE_SIZE / 2,
                    borderWidth: 2,
                    borderColor: !hasStories ? colors.border : allViewed ? colors.textMuted : colors.accentFill,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Avatar userId={group.userId} size={AVATAR_SIZE} colorIndex={i} />
                </View>
                {group.isOwn && (
                  <Pressable
                    onPress={onOpenStoryComposer}
                    hitSlop={6}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colors.accentFill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: colors.background,
                    }}
                  >
                    <Ionicons name="add" size={16} color={colors.onAccentFill} />
                  </Pressable>
                )}
              </View>
              <Text
                style={{ fontSize: 11, lineHeight: 14, color: colors.textPrimary, maxWidth: CIRCLE_SIZE }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {group.username}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ height: 1, backgroundColor: colors.border, marginTop: 16 }} />

      {!firebaseReady ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            Firebase isn't configured yet — add your config to .env to see the feed.
          </Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            No flights logged yet — be the first to post one.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReviewCard
              review={item}
              userId={user.uid}
              onPress={() => onOpenReview(item.id)}
              onOpenComments={onOpenComments}
              onOpenProfile={onOpenProfile}
            />
          )}
        />
      )}
    </View>
  );
}
