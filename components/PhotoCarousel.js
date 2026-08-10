import { useState } from 'react';
import { View, Text, Image, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

const HEIGHT = 240;
const HORIZONTAL_INSET = 32; // matches the 16px padding on each side of the card/screen

export default function PhotoCarousel({ photos }) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const itemWidth = windowWidth - HORIZONTAL_INSET;

  if (!photos || photos.length === 0) {
    return (
      <View
        style={{
          width: '100%',
          height: HEIGHT,
          borderRadius: 12,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons name="image-outline" size={28} color={colors.textMuted} />
      </View>
    );
  }

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / itemWidth);
    setActiveIndex(idx);
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={{ width: itemWidth, borderRadius: 12 }}
      >
        {photos.map((photo, i) => (
          <View
            key={`${photo.category}-${i}`}
            style={{ width: itemWidth, height: HEIGHT, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface }}
          >
            <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            <View
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                backgroundColor: 'rgba(0,0,0,0.55)',
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 10, color: '#fff', textTransform: 'capitalize' }}>{photo.category}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {photos.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 6 }}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: i === activeIndex ? colors.accentFill : colors.border,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
