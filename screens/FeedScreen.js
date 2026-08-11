import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ReviewCard from '../components/ReviewCard';
import Avatar from '../components/Avatar';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function FeedScreen({ user, onOpenStory, onOpenReview, onOpenComments, onOpenProfile }) {
  const { colors } = useTheme();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  // No dedicated story-creation flow yet — a "story" is just a user's most
  // recent review from the last 24h, deduped by user. Tapping it opens that
  // review, matching the planned "story links to full review" behavior
  // without needing a separate Story document written on every post.
  const stories = useMemo(() => {
    const cutoff = Date.now() - DAY_MS;
    const latestByUser = new Map();
    for (const r of reviews) {
      const ms = r.createdAt?.toMillis ? r.createdAt.toMillis() : null;
      if (!ms || ms < cutoff) continue;
      if (!latestByUser.has(r.userId)) latestByUser.set(r.userId, r);
    }
    const ownReview = latestByUser.get(user.uid);
    const others = Array.from(latestByUser.values()).filter((r) => r.userId !== user.uid);
    return [
      { id: 'own', userId: user.uid, username: 'you', reviewId: ownReview?.id ?? null },
      ...others.map((r) => ({ id: r.id, userId: r.userId, username: r.username || 'pilot', reviewId: r.id })),
    ];
  }, [reviews, user.uid]);

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
        <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ height: 84 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingBottom: 8 }}
      >
        {stories.map((story, i) => (
          <Pressable
            key={story.id}
            onPress={() => story.reviewId && onOpenStory(story)}
            style={{ alignItems: 'center', gap: 4, width: 60 }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                borderWidth: 2,
                borderColor: story.reviewId ? colors.accentFill : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Avatar userId={story.userId} size={44} colorIndex={i} />
            </View>
            <Text
              style={{ fontSize: 11, color: colors.textPrimary, maxWidth: 60 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {story.username}
            </Text>
          </Pressable>
        ))}
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
