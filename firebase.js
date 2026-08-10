import { initializeApp, getApps, getApp } from '@firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
import { getStorage } from '@firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(firebaseConfig.apiKey);

let auth = null;
let db = null;
let storage = null;

if (firebaseReady) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // initializeAuth throws if called twice, which happens during Fast Refresh in dev
  try {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    auth = getAuth(app);
  }

  db = getFirestore(app);
  storage = getStorage(app);
}

export { auth, db, storage };
