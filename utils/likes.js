import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';

// Idempotent "make sure this is liked" — used by double-tap-to-like, which
// (unlike LikeButton's toggle) has no local liked/unliked state of its own
// to branch on, so it always needs to check first rather than blindly
// incrementing. Returns false (no-op) if already liked, so callers can tell
// whether a write actually happened.
export async function likeReview(reviewId, userId) {
  if (!firebaseReady || !reviewId || !userId) return false;
  const likeRef = doc(db, 'reviews', reviewId, 'likes', userId);
  const existing = await getDoc(likeRef);
  if (existing.exists()) return false;
  await setDoc(likeRef, { userId, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'reviews', reviewId), { likesCount: increment(1) });
  return true;
}
