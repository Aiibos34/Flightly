import { collection, addDoc, serverTimestamp } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { uploadMedia, storyMediaPath } from './storage';

// Standalone story upload — not tied to a flight review. Media is uploaded
// to Firebase Storage (see utils/storage.js) so it renders on other users'
// devices, not just the one that captured it.
export async function createStory(userId, username, mediaUri, mediaType) {
  if (!firebaseReady) return;
  const mediaURL = await uploadMedia(mediaUri, storyMediaPath(userId, mediaType));
  await addDoc(collection(db, 'stories'), {
    userId,
    username,
    mediaURL,
    mediaType, // 'image' | 'video'
    createdAt: serverTimestamp(),
  });
}
