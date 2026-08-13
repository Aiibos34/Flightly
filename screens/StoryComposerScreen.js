import { useRef, useState } from 'react';
import { View, Text, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '../theme';
import { createStory } from '../utils/stories';

function PreviewVideo({ uri }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return <VideoView player={player} style={{ flex: 1 }} contentFit="cover" nativeControls={false} />;
}

// Tap the + on the feed and land straight in a locked-in camera view (our
// own UI, not the system camera app — that's what expo-camera's CameraView
// buys us over expo-image-picker's launchCameraAsync). Shutter takes a
// photo; the gallery icon on the same bar switches to picking existing
// media instead. Either path lands on a preview step before anything posts.
export default function StoryComposerScreen({ user, onBack, onDone }) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [captured, setCaptured] = useState(null); // { uri, mediaType }
  const [posting, setPosting] = useState(false);
  const cameraRef = useRef(null);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync();
    setCaptured({ uri: photo.uri, mediaType: 'image' });
  };

  const pickFromGallery = async () => {
    const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!galleryPermission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add to your story.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setCaptured({ uri: asset.uri, mediaType: asset.type === 'video' ? 'video' : 'image' });
    }
  };

  const post = async () => {
    if (!captured) return;
    setPosting(true);
    try {
      await createStory(user.uid, user.email ? user.email.split('@')[0] : 'pilot', captured.uri, captured.mediaType);
      onDone();
    } catch {
      Alert.alert('Could not post story', 'Something went wrong — try again.');
    } finally {
      setPosting(false);
    }
  };

  // Preview step — shown after capturing/picking, before it's actually posted.
  if (captured) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1 }}>
          {captured.mediaType === 'video' ? (
            <PreviewVideo uri={captured.uri} />
          ) : (
            <Image source={{ uri: captured.uri }} style={{ flex: 1 }} resizeMode="cover" />
          )}
        </View>

        <Pressable onPress={() => setCaptured(null)} hitSlop={10} style={{ position: 'absolute', top: 50, left: 20 }}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </Pressable>

        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.surface,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 32,
          }}
        >
          <Pressable
            onPress={post}
            disabled={posting}
            style={{
              backgroundColor: colors.accentFill,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: posting ? 0.6 : 1,
            }}
          >
            {posting ? (
              <ActivityIndicator color={colors.onAccentFill} />
            ) : (
              <Text style={{ color: colors.onAccentFill, fontSize: 16, fontWeight: '600' }}>Post story</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Ionicons name="camera-outline" size={36} color={colors.textMuted} style={{ marginBottom: 12 }} />
        <Text style={{ color: colors.textPrimary, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
          Allow camera access to add to your story.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={{ backgroundColor: colors.accentFill, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 }}
        >
          <Text style={{ color: colors.onAccentFill, fontSize: 14, fontWeight: '500' }}>Grant permission</Text>
        </Pressable>
        <Pressable onPress={onBack} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />

      <Pressable onPress={onBack} hitSlop={10} style={{ position: 'absolute', top: 50, right: 20 }}>
        <Ionicons name="close" size={28} color="#fff" />
      </Pressable>

      <Pressable
        onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
        hitSlop={10}
        style={{ position: 'absolute', top: 50, left: 20 }}
      >
        <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
      </Pressable>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 36,
          paddingBottom: 40,
        }}
      >
        <Pressable onPress={pickFromGallery} hitSlop={10}>
          <Ionicons name="images-outline" size={30} color="#fff" />
        </Pressable>

        <Pressable
          onPress={takePhoto}
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            borderWidth: 4,
            borderColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' }} />
        </Pressable>

        <View style={{ width: 30 }} />
      </View>
    </View>
  );
}
