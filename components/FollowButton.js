import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';

export default function FollowButton({ currentUserId, targetUserId, onChange }) {
  const { colors } = useTheme();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!firebaseReady || currentUserId === targetUserId) return;
    const unsubscribe = onSnapshot(doc(db, 'users', targetUserId, 'followers', currentUserId), (snap) => {
      setFollowing(snap.exists());
    });
    return unsubscribe;
  }, [currentUserId, targetUserId]);

  if (currentUserId === targetUserId) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (following) {
        await deleteDoc(doc(db, 'users', targetUserId, 'followers', currentUserId));
        await deleteDoc(doc(db, 'users', currentUserId, 'following', targetUserId));
      } else {
        await setDoc(doc(db, 'users', targetUserId, 'followers', currentUserId), {
          userId: currentUserId,
          createdAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'users', currentUserId, 'following', targetUserId), {
          userId: targetUserId,
          createdAt: serverTimestamp(),
        });
      }
      onChange?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={toggle}
      disabled={busy}
      style={{
        paddingHorizontal: 24,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: following ? colors.surface : colors.accentFill,
        borderWidth: following ? 1 : 0,
        borderColor: colors.border,
        opacity: busy ? 0.6 : 1,
      }}
    >
      <Text style={{ color: following ? colors.textPrimary : colors.onAccentFill, fontSize: 13, fontWeight: '500' }}>
        {following ? 'Following' : 'Follow'}
      </Text>
    </Pressable>
  );
}
