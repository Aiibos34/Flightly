import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { collection, query, orderBy, limit, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';

export default function CommentsPreview({ reviewId, commentsCount, onViewAll }) {
  const { colors } = useTheme();
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'reviews', reviewId, 'comments'), orderBy('createdAt', 'desc'), limit(2));
    const unsubscribe = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse());
    });
    return unsubscribe;
  }, [reviewId]);

  if (comments.length === 0) return null;

  return (
    <View style={{ marginTop: 10 }}>
      {comments.map((c) => (
        <Text key={c.id} style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 3 }}>
          <Text style={{ fontWeight: '500', color: colors.textPrimary }}>{c.username || 'pilot'} </Text>
          {c.text}
        </Text>
      ))}
      {commentsCount > comments.length && (
        <Pressable onPress={(e) => { e.stopPropagation?.(); onViewAll(); }} hitSlop={6}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>
            View all {commentsCount} comments
          </Text>
        </Pressable>
      )}
    </View>
  );
}
