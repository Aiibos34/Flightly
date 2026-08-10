import { useEffect, useState } from 'react';
import { FlatList, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, query, orderBy, onSnapshot, addDoc, updateDoc, increment, serverTimestamp } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';

export default function CommentsScreen({ reviewId, user, onBack, onOpenProfile }) {
  const { colors } = useTheme();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'reviews', reviewId, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [reviewId]);

  const post = async () => {
    if (!text.trim() || !firebaseReady) return;
    const value = text.trim();
    setText('');
    await addDoc(collection(db, 'reviews', reviewId, 'comments'), {
      userId: user.uid,
      username: user.email ? user.email.split('@')[0] : 'pilot',
      text: value,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'reviews', reviewId), { commentsCount: increment(1) });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Comments" onBack={onBack} />
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Be the first to comment.</Text>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <Pressable onPress={() => onOpenProfile(item.userId)}>
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 2 }}>
                {item.username || 'pilot'}
              </Text>
            </Pressable>
            <Text style={{ color: colors.textPrimary, fontSize: 14 }}>{item.text}</Text>
          </View>
        )}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a comment"
          placeholderTextColor={colors.textMuted}
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            color: colors.textPrimary,
          }}
        />
        <Pressable onPress={post} hitSlop={8}>
          <Ionicons name="send" size={20} color={colors.accentText} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
