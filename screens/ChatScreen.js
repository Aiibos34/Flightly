import { useEffect, useRef, useState } from 'react';
import { FlatList, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, query, orderBy, onSnapshot } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import Avatar from '../components/Avatar';
import { sendMessage, markChatRead } from '../utils/chats';

export default function ChatScreen({ user, chatId, otherUserId, otherUsername, onBack }) {
  const { colors } = useTheme();
  const [messages, setMessages] = useState([]);
  const [chatDoc, setChatDoc] = useState(null);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [chatId]);

  useEffect(() => {
    if (!firebaseReady) return;
    const unsubscribe = onSnapshot(doc(db, 'chats', chatId), (snap) => {
      setChatDoc(snap.data() ?? null);
    });
    return unsubscribe;
  }, [chatId]);

  // Marks read on open, and again whenever a new message lands while this
  // screen is already open — otherwise a message that arrives mid-visit
  // would stay "unread" until the chat is reopened.
  useEffect(() => {
    if (messages.length > 0) markChatRead(chatId, user.uid);
  }, [chatId, user.uid, messages.length]);

  const send = async () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    await sendMessage(chatId, user.uid, value).catch(() => {});
  };

  const lastMineIndex = [...messages].map((m) => m.senderId).lastIndexOf(user.uid);
  const otherLastReadMs = chatDoc?.lastRead?.[otherUserId]?.toMillis?.() ?? 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Avatar userId={otherUserId} size={34} />
        <Text style={{ fontSize: 16, fontWeight: '500', color: colors.textPrimary }}>{otherUsername}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => {
          const mine = item.senderId === user.uid;
          const messageMs = item.createdAt?.toMillis?.() ?? 0;
          const showSeen = mine && index === lastMineIndex && messageMs > 0 && otherLastReadMs >= messageMs;
          return (
            <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
              {!!item.meta?.storyReply && (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Replied to your story</Text>
              )}
              <View
                style={{
                  maxWidth: '75%',
                  backgroundColor: mine ? colors.accentFill : colors.surface,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: mine ? colors.onAccentFill : colors.textPrimary, fontSize: 14 }}>{item.text}</Text>
              </View>
              {showSeen && <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Seen</Text>}
            </View>
          );
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
          }}
        />
        <Pressable onPress={send} disabled={!text.trim()} hitSlop={8} style={{ opacity: text.trim() ? 1 : 0.4 }}>
          <Ionicons name="send" size={22} color={colors.accentFill} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
