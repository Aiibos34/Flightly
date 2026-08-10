import { useState } from 'react';
import { View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../theme';

const MIN = 0;
const MAX = 5;
const STEP = 0.25;
const TICK_COUNT = Math.round((MAX - MIN) / STEP) + 1; // 21 — one per 0.25 step

export default function RatingBar({ label, value, onChange }) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const clamp = (v) => Math.min(MAX, Math.max(MIN, v));
  const snap = (v) => Math.round(v / STEP) * STEP;

  const updateFromX = (x) => {
    if (trackWidth <= 0) return;
    onChange(snap(clamp((x / trackWidth) * MAX)));
  };

  // Gesture Handler (not Pressable/PanResponder) is what actually negotiates
  // correctly with the enclosing ScrollView's native touch interception on
  // Android — that negotiation is exactly what those earlier approaches lacked.
  const pan = Gesture.Pan()
    .onBegin((e) => updateFromX(e.x))
    .onUpdate((e) => updateFromX(e.x))
    .runOnJS(true);

  const tap = Gesture.Tap()
    .onEnd((e) => updateFromX(e.x))
    .runOnJS(true);

  const gesture = Gesture.Simultaneous(pan, tap);

  const fillPct = Math.max(0, Math.min(100, (clamp(value) / MAX) * 100));

  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, color: colors.textPrimary }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.accentText }}>
          {clamp(value).toFixed(2)}
        </Text>
      </View>

      <GestureDetector gesture={gesture}>
        <View
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          style={{ height: 32, justifyContent: 'center' }}
        >
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${fillPct}%`, backgroundColor: colors.accentFill }} />
          </View>

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            {Array.from({ length: TICK_COUNT }).map((_, i) => (
              <View key={i} style={{ width: 1, height: 8, backgroundColor: colors.background, opacity: 0.6 }} />
            ))}
          </View>

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: `${fillPct}%`,
              marginLeft: -11,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: colors.accentFill,
              borderWidth: 2,
              borderColor: colors.background,
            }}
          />
        </View>
      </GestureDetector>
    </View>
  );
}
