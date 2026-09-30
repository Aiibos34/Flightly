import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import { storage, firebaseReady } from '../firebase';

// Every photo/video in the app has been a raw local device URI or an
// external URL up to now — never actually uploaded anywhere (see
// PLANNING.md's Phase 1.5 note). That means a photo you post is only
// guaranteed to render on the device that took it. This is the fix: upload
// to Firebase Storage and store the resulting https download URL instead.
//
// `fetch(uri).blob()` is the standard RN/Expo pattern for turning a local
// file:// (native) or blob:/data: (web) URI into upload-able bytes — it
// works uniformly across both without needing separate native/web paths.
export async function uploadMedia(localUri, storagePath) {
  if (!firebaseReady) return localUri;
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

// Already-uploaded (or seeded external) URLs start with http(s) — anything
// else (file://, content://, ph://, blob:, data:) is a local URI that still
// needs uploading. Lets callers skip re-uploading photos that are already
// real Storage/external URLs, e.g. when editing a review.
export function isLocalUri(uri) {
  return !!uri && !/^https?:\/\//i.test(uri);
}

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function reviewPhotoPath(userId, category) {
  return `users/${userId}/reviews/${uniqueSuffix()}-${category}.jpg`;
}

export function profilePhotoPath(userId) {
  return `users/${userId}/profile/${uniqueSuffix()}.jpg`;
}

export function storyMediaPath(userId, mediaType) {
  return `users/${userId}/stories/${uniqueSuffix()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
}
