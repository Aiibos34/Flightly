import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import { haptics } from '../utils/haptics';

export default function LikeButton({ reviewId, userId, likesCount }) {
  const { colors } = useTheme();
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!firebaseReady || !userId) return;
    const unsubscribe = onSnapshot(doc(db, 'reviews', reviewId, 'likes', userId), (snap) => {
      setLiked(snap.exists());
    });
    return unsubscribe;
  }, [reviewId, userId]);

  const toggle = async () => {
    if (busy || !firebaseReady) return;
    setBusy(true);
    const likeRef = doc(db, 'reviews', reviewId, 'likes', userId);
    const reviewRef = doc(db, 'reviews', reviewId);
    haptics.tap();
    try {
      if (liked) {
        await deleteDoc(likeRef);
        await updateDoc(reviewRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, { userId, createdAt: serverTimestamp() });
        await updateDoc(reviewRef, { likesCount: increment(1) });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        toggle();
      }}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
    >
      <Ionicons name={liked ? 'heart' : 'heart-outline'} size={17} color={colors.accentText} />
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{Math.max(likesCount ?? 0, 0)}</Text>
    </Pressable>
  );
}
