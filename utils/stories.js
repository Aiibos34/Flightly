import { collection, addDoc, serverTimestamp } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';

// Standalone story upload — not tied to a flight review. Media is stored as
// the local device URI directly, same as every other photo in this app
// (review photos, profile photo) — there's no Firebase Storage upload step
// anywhere yet, since Storage is on hold pending the Blaze plan decision
// (see PLANNING.md). That means, like those other photos, a story is only
// guaranteed to render correctly on the device that uploaded it until
// Storage is wired up.
export async function createStory(userId, username, mediaUri, mediaType) {
  if (!firebaseReady) return;
  await addDoc(collection(db, 'stories'), {
    userId,
    username,
    mediaURL: mediaUri,
    mediaType, // 'image' | 'video'
    createdAt: serverTimestamp(),
  });
}
