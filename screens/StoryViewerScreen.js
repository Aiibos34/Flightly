import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  SafeAreaView,
  Animated,
  Easing,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '../theme';
import { markStoryViewed } from '../utils/storyViews';
import { ensureChat, sendMessage } from '../utils/chats';

const STORY_DURATION_MS = 5000;
const TAP_HOLD_THRESHOLD_MS = 300; // shorter than this on release = a tap, not a hold
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;
const CUBE_DURATION_MS = 380;

function StoryVideo({ uri }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} />;
}

function StoryMedia({ media, colors }) {
  if (!media?.mediaURL) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.surface }}>
        <Ionicons name="image-outline" size={36} color={colors.textMuted} />
      </View>
    );
  }
  if (media.mediaType === 'video') {
    return <StoryVideo key={media.id} uri={media.mediaURL} />;
  }
  return <Image source={{ uri: media.mediaURL }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />;
}

// Instagram/Snapchat-style viewer. `groups` is one entry per person, each
// holding all of that person's active stories — the progress bar shows one
// segment per story *within the current person's group*, not one per
// person overall. Tap the left/right half to move within (then across)
// groups (with a 3D cube-turn transition, like Instagram), press and hold
// to pause, swipe down to close.
export default function StoryViewerScreen({ stories: groups, initialIndex, onBack, user, onOpenChat }) {
  const { colors } = useTheme();
  const [groupIndex, setGroupIndex] = useState(initialIndex ?? 0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [transition, setTransition] = useState(null); // { from, to, direction: 'next' | 'prev' }
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showSentToast, setShowSentToast] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cubeAnim = useRef(new Animated.Value(0)).current;
  const elapsedRef = useRef(0); // ms already played for the current slide, for pause/resume
  const pressStartRef = useRef(0);
  const translateY = useRef(new Animated.Value(0)).current;

  const group = groups[groupIndex];
  const slides = group?.stories ?? [];
  const media = slides[slideIndex];

  useEffect(() => {
    if (media?.id) markStoryViewed(media.id).catch(() => {});
  }, [media?.id]);

  // Animates the current story rotating away like a cube face while the
  // target one rotates in from the same edge — the actual state (groupIndex/
  // slideIndex) only commits once the animation finishes.
  const runCubeTransition = (toGroupIndex, toSlideIndex, direction) => {
    const toMedia = groups[toGroupIndex]?.stories?.[toSlideIndex];
    setTransition({ from: media, to: toMedia, direction });
    cubeAnim.setValue(0);
    Animated.timing(cubeAnim, {
      toValue: 1,
      duration: CUBE_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setGroupIndex(toGroupIndex);
      setSlideIndex(toSlideIndex);
      setTransition(null);
    });
  };

  const goNext = () => {
    if (transition) return;
    if (slideIndex < slides.length - 1) {
      runCubeTransition(groupIndex, slideIndex + 1, 'next');
    } else if (groupIndex < groups.length - 1) {
      runCubeTransition(groupIndex + 1, 0, 'next');
    } else {
      onBack();
    }
  };

  const goPrev = () => {
    if (transition) return;
    if (slideIndex > 0) {
      runCubeTransition(groupIndex, slideIndex - 1, 'prev');
      return;
    }
    if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      const targetSlide = Math.max(0, (prevGroup.stories?.length || 1) - 1);
      runCubeTransition(groupIndex - 1, targetSlide, 'prev');
    }
  };

  // Reset progress whenever the visible slide changes.
  useEffect(() => {
    progressAnim.setValue(0);
    elapsedRef.current = 0;
    setPaused(false);
    setReplyText('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, slideIndex]);

  // A reply becomes a DM to the story's owner, not a public comment —
  // reuses/creates the 1:1 chat between the two of you, same as tapping
  // into their profile and messaging them directly would.
  const sendReply = async () => {
    const value = replyText.trim();
    if (!value || !media || sendingReply) return;
    setSendingReply(true);
    try {
      const myUsername = user.email ? user.email.split('@')[0] : 'pilot';
      const chatId = await ensureChat(user.uid, myUsername, group.userId, group.username);
      await sendMessage(chatId, user.uid, value, {
        storyReply: true,
        storyMediaURL: media.mediaURL,
      });
      setReplyText('');
      Keyboard.dismiss();
      setShowSentToast(true);
      setTimeout(() => setShowSentToast(false), 1800);
    } catch {
      Alert.alert('Could not send', 'Something went wrong — try again.');
    } finally {
      setSendingReply(false);
    }
  };

  // Resuming on keyboardDidHide rather than the TextInput's onBlur — blur
  // also fires when tapping the send button itself, and un-pausing right
  // then raced with (and could swallow) that same tap on Android.
  // keyboardDidHide fires after the dismiss animation finishes, well clear
  // of any in-flight button press.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => setPaused(false));
    return () => sub.remove();
  }, []);

  // Driven by Animated.timing rather than a setInterval + state tick — this
  // runs on every animation frame instead of once per 100ms, which is what
  // made the bar look stepped instead of smooth. Pausing stops the
  // animation in place (Animated retains its current value); resuming
  // starts a fresh timing animation for just the remaining duration. Also
  // holds off entirely while a cube transition is playing, so the outgoing
  // slide's timer can't race its own goNext() a second time.
  useEffect(() => {
    if (paused || transition) return undefined;
    const remaining = STORY_DURATION_MS - elapsedRef.current;
    if (remaining <= 0) {
      goNext();
      return undefined;
    }
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: remaining,
      easing: Easing.linear,
      useNativeDriver: false, // animating width, which the native driver can't
    });
    anim.start(({ finished }) => {
      if (finished) goNext();
    });
    return () => {
      progressAnim.stopAnimation((value) => {
        elapsedRef.current = value * STORY_DURATION_MS;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, slideIndex, paused, transition]);

  const handlePressIn = () => {
    pressStartRef.current = Date.now();
    setPaused(true);
  };

  const handlePressOut = (navigate) => {
    setPaused(false);
    if (Date.now() - pressStartRef.current < TAP_HOLD_THRESHOLD_MS) navigate();
  };

  // Swipe-down-to-close, with the story visibly following the finger and
  // easing away (a "sinking" feel) rather than vanishing at a threshold.
  // Only activates after real vertical movement, so it doesn't steal the
  // tap/hold zones below (same cooperative-gesture technique this app
  // already uses for RatingBar's drag).
  const swipeDown = Gesture.Pan()
    .activeOffsetY([15, 1000])
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.setValue(e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        Animated.timing(translateY, { toValue: 900, duration: 250, useNativeDriver: true }).start(onBack);
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      }
    })
    .runOnJS(true);

  const dismissOpacity = translateY.interpolate({ inputRange: [0, 400], outputRange: [1, 0.4], extrapolate: 'clamp' });
  const dismissScale = translateY.interpolate({ inputRange: [0, 400], outputRange: [1, 0.92], extrapolate: 'clamp' });

  if (!group) return null;

  // Outgoing face rotates away around the edge it's heading towards;
  // incoming face rotates in from the opposite edge — the classic cube-turn.
  // (Signs mirrored from the first pass — that version had "next" entering
  // from the left instead of the right.)
  const outgoingRotate = transition
    ? cubeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: transition.direction === 'next' ? ['0deg', '100deg'] : ['0deg', '-100deg'],
      })
    : '0deg';
  const incomingRotate = transition
    ? cubeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: transition.direction === 'next' ? ['-100deg', '0deg'] : ['100deg', '0deg'],
      })
    : '0deg';
  const outgoingOpacity = cubeAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Swipe-to-dismiss only wraps the story content, not the reply
              bar below — GestureDetector's pan recognizer was intercepting
              the Send button's touch even though the gesture never
              activated (onPressIn fired, onPress never did). Keeping the
              reply bar as a sibling outside it sidesteps that entirely. */}
          <GestureDetector gesture={swipeDown}>
          <Animated.View style={{ flex: 1, opacity: dismissOpacity, transform: [{ translateY }, { scale: dismissScale }] }}>
            <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 8 }}>
              {slides.map((s, i) => (
                <View
                  key={s.id}
                  style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}
                >
                  {i === slideIndex ? (
                    <Animated.View
                      style={{
                        height: '100%',
                        backgroundColor: '#fff',
                        width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                      }}
                    />
                  ) : (
                    <View style={{ height: '100%', width: i < slideIndex ? '100%' : '0%', backgroundColor: '#fff' }} />
                  )}
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>{group.username}</Text>
              <Pressable onPress={onBack} hitSlop={8}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            <View
              style={{
                flex: 1,
                marginHorizontal: 22,
                marginBottom: 12,
                borderRadius: 18,
                backgroundColor: colors.surface,
                overflow: 'hidden',
              }}
            >
              {transition ? (
                <>
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        transformOrigin: transition.direction === 'next' ? 'right' : 'left',
                        opacity: outgoingOpacity,
                        transform: [{ perspective: 1200 }, { rotateY: outgoingRotate }],
                      },
                    ]}
                  >
                    <StoryMedia media={transition.from} colors={colors} />
                  </Animated.View>
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        transformOrigin: transition.direction === 'next' ? 'left' : 'right',
                        transform: [{ perspective: 1200 }, { rotateY: incomingRotate }],
                      },
                    ]}
                  >
                    <StoryMedia media={transition.to} colors={colors} />
                  </Animated.View>
                </>
              ) : (
                <StoryMedia media={media} colors={colors} />
              )}

              <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%' }}>
                <Pressable style={{ flex: 1 }} onPressIn={handlePressIn} onPressOut={() => handlePressOut(goPrev)} />
              </View>
              <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%' }}>
                <Pressable style={{ flex: 1 }} onPressIn={handlePressIn} onPressOut={() => handlePressOut(goNext)} />
              </View>
            </View>
          </Animated.View>
          </GestureDetector>

            {!group.isOwn && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 16,
                  paddingTop: 10,
                  paddingBottom: 16,
                }}
              >
                <TextInput
                  value={replyText}
                  onChangeText={setReplyText}
                  onFocus={() => setPaused(true)}
                  placeholder={`Reply to ${group.username}...`}
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.4)',
                    borderRadius: 22,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    color: '#fff',
                    fontSize: 14,
                  }}
                />
                {!!replyText.trim() && (
                  <Pressable onPress={sendReply} disabled={sendingReply} hitSlop={8} style={{ padding: 6 }}>
                    <Ionicons name="send" size={22} color={colors.accentFill} />
                  </Pressable>
                )}
              </View>
            )}

            {showSentToast && (
              <View
                style={{
                  position: 'absolute',
                  bottom: group.isOwn ? 24 : 74,
                  alignSelf: 'center',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Ionicons name="checkmark-circle" size={16} color={colors.accentFill} />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>Message sent!</Text>
              </View>
            )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
