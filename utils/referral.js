import { collection, doc, query, where, limit, getDocs, getDoc, setDoc, addDoc, serverTimestamp } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { awardBadge } from './badges';

const CODE_LENGTH = 6;
// Excludes visually-ambiguous characters (0/O, 1/I/L) so a code is easy to
// read aloud or retype correctly.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function isCodeTaken(code) {
  const snap = await getDocs(query(collection(db, 'users'), where('referralCode', '==', code), limit(1)));
  return !snap.empty;
}

// Lazily creates and persists a referral code the first time a user needs
// one (visiting Invite Friends), rather than generating one for every signup
// whether or not they ever use it.
export async function ensureReferralCode(userId) {
  if (!firebaseReady) return null;
  const userSnap = await getDoc(doc(db, 'users', userId));
  const existing = userSnap.data()?.referralCode;
  if (existing) return existing;

  let code = randomCode();
  // Collision odds are tiny at this app's scale, but check anyway.
  for (let attempt = 0; attempt < 5 && (await isCodeTaken(code)); attempt++) {
    code = randomCode();
  }
  await setDoc(doc(db, 'users', userId), { referralCode: code }, { merge: true });
  return code;
}

// Redeems a code at signup: records the Referral doc, sets referredBy on the
// new user, and awards both sides a badge. Caller (AuthScreen) only calls
// this once, right after account creation, so there's no repeat-redemption
// guard needed here.
export async function applyReferralCode(newUserId, rawCode) {
  if (!firebaseReady || !rawCode) return false;
  const code = rawCode.trim().toUpperCase();
  if (!code) return false;

  const snap = await getDocs(query(collection(db, 'users'), where('referralCode', '==', code), limit(1)));
  if (snap.empty) return false;
  const referrerUserId = snap.docs[0].id;
  if (referrerUserId === newUserId) return false;

  await setDoc(doc(db, 'users', newUserId), { referredBy: referrerUserId }, { merge: true });
  await addDoc(collection(db, 'referrals'), {
    referrerUserId,
    referredUserId: newUserId,
    createdAt: serverTimestamp(),
  });
  await Promise.all([awardBadge(referrerUserId, 'recruiter'), awardBadge(newUserId, 'welcome_aboard')]);
  return true;
}
