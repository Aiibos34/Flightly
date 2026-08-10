import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function StoryViewerScreen({ story, onBack, onOpenReview }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>{story.username}</Text>
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={{ flex: 1, marginHorizontal: 16, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="image-outline" size={40} color={colors.textMuted} />
      </View>

      {story.reviewId && (
        <Pressable
          onPress={() => onOpenReview(story.reviewId)}
          style={{
            margin: 16,
            backgroundColor: colors.accentFill,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.onAccentFill, fontSize: 14, fontWeight: '500' }}>
            View full flight review
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}
