import { useEffect, useState } from 'react';
import { View, Image } from 'react-native';
import { doc, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';

// Live-looks-up the user's current photoURL rather than denormalizing it
// onto each review/story the way username is — a profile photo set after
// the fact should show up on that person's older posts too, not just new
// ones going forward.
export default function Avatar({ userId, size = 36, colorIndex = 0 }) {
  const { colors } = useTheme();
  const [photoURL, setPhotoURL] = useState(null);

  useEffect(() => {
    if (!firebaseReady || !userId) return;
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (snap) => {
      setPhotoURL(snap.data()?.photoURL ?? null);
    });
    return unsubscribe;
  }, [userId]);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.avatarPlaceholders[colorIndex % colors.avatarPlaceholders.length],
        overflow: 'hidden',
      }}
    >
      {photoURL && <Image source={{ uri: photoURL }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
    </View>
  );
}
