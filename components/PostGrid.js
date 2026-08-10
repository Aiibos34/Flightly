import { View, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function PostGrid({ reviews, onOpenReview }) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
      {reviews.map((r) => {
        const firstPhoto = r.photos?.[0];
        return (
          <Pressable
            key={r.id}
            onPress={() => onOpenReview(r.id)}
            style={{
              width: '32.6%',
              aspectRatio: 1,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {firstPhoto ? (
              <Image source={{ uri: firstPhoto.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Ionicons name="image-outline" size={20} color={colors.textMuted} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
