import { collection, doc, getDoc, setDoc, updateDoc, addDoc, serverTimestamp } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';

// Deterministic id from the two participants — lets us look up "the chat
// between these two people" directly instead of needing an indexed query,
// same reasoning as the airport/badge lookups elsewhere in this app.
export function getChatId(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

export async function ensureChat(uidA, usernameA, uidB, usernameB) {
  const chatId = getChatId(uidA, uidB);
  const ref = doc(db, 'chats', chatId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participantIds: [uidA, uidB],
      participantUsernames: { [uidA]: usernameA, [uidB]: usernameB },
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: null,
    });
  }
  return chatId;
}

export async function sendMessage(chatId, senderId, text, meta) {
  if (!firebaseReady || !text?.trim()) return;
  const trimmed = text.trim();
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
    ...(meta ? { meta } : {}),
  });
  await setDoc(
    doc(db, 'chats', chatId),
    { lastMessage: trimmed, lastMessageAt: serverTimestamp(), lastMessageSenderId: senderId },
    { merge: true }
  );
}

// Stamps when this user last opened the chat — read via a dot-path update
// so it only touches this user's entry in the lastRead map, not the whole
// field (a plain setDoc merge would replace the entire map, wiping out the
// other participant's read timestamp).
export async function markChatRead(chatId, userId) {
  if (!firebaseReady) return;
  try {
    await updateDoc(doc(db, 'chats', chatId), { [`lastRead.${userId}`]: serverTimestamp() });
  } catch {
    // best-effort — worst case the read receipt/unread dot is a beat stale
  }
}

// A chat is "unread" for a user if the last message wasn't sent by them and
// arrived after their last recorded read time. Backs both the chat-list red
// dot and the feed's airplane-icon indicator.
export function hasUnreadMessages(chat, userId) {
  if (!chat || !chat.lastMessageSenderId || chat.lastMessageSenderId === userId) return false;
  const lastMessageMs = chat.lastMessageAt?.toMillis?.() ?? 0;
  const lastReadMs = chat.lastRead?.[userId]?.toMillis?.() ?? 0;
  return lastMessageMs > lastReadMs;
}
