import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  getCountFromServer,
} from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import FollowButton from '../components/FollowButton';
import PostGrid from '../components/PostGrid';
import { getAirlineLogoUrl, COMMON_AIRLINES } from '../utils/airlineLogo';
import { getAircraftPhotoUrl, COMMON_AIRCRAFT } from '../utils/aircraftPhoto';
import { BADGES } from '../utils/badges';

function StatColumn({ label, value, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', minWidth: 64 }}>
      <Text style={{ fontSize: 17, fontWeight: '500', color: colors.textPrimary }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.textMuted }}>{label}</Text>
    </Pressable>
  );
}

function AircraftPickerRow({ item, onSelect }) {
  const { colors } = useTheme();
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAircraftPhotoUrl(item.label).then((url) => {
      if (!cancelled) setThumb(url);
    });
    return () => {
      cancelled = true;
    };
  }, [item.label]);

  return (
    <Pressable
      onPress={() => onSelect(item.label)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
    >
      <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: colors.background, overflow: 'hidden' }}>
        {thumb && <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{item.label}</Text>
    </Pressable>
  );
}

function FavoriteLogoSlot({ label, uri, editable, onPick, background, imageResizeMode = 'cover' }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={editable ? onPick : undefined}
      style={{ alignItems: 'center', gap: 6, width: 96 }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: background || colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode={imageResizeMode} />
        ) : (
          <Ionicons name="add" size={20} color={colors.textMuted} />
        )}
      </View>
      <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export default function ProfileScreen({ user, profileUserId, onOpenAccount, onOpenInvite, onOpenUpcomingFlights, onOpenReview, onOpenPosts, onOpenFollowList, onOpenStatList, onBack }) {
  const { colors } = useTheme();
  const targetUserId = profileUserId || user.uid;
  const isOwnProfile = targetUserId === user.uid;

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ flights: 0, airports: 0, airlines: 0 });
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [editingFavorite, setEditingFavorite] = useState(null); // null | 'airline' | 'aircraft'
  const [favoriteAircraftPhoto, setFavoriteAircraftPhoto] = useState(null);
  const [earnedBadgeKeys, setEarnedBadgeKeys] = useState([]);

  useEffect(() => {
    if (!firebaseReady) return;
    const unsubscribe = onSnapshot(doc(db, 'users', targetUserId), (snap) => {
      const data = snap.data();
      setProfile(data ?? null);
      setBioDraft(data?.bio ?? '');
    });
    return unsubscribe;
  }, [targetUserId]);

  useEffect(() => {
    let cancelled = false;
    if (!profile?.favoriteAircraftType) {
      setFavoriteAircraftPhoto(null);
      return;
    }
    getAircraftPhotoUrl(profile.favoriteAircraftType).then((url) => {
      if (!cancelled) setFavoriteAircraftPhoto(url);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.favoriteAircraftType]);

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'reviews'), where('userId', '==', targetUserId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      const airlines = new Set(docs.map((r) => r.airline).filter(Boolean));
      const airports = new Set();
      docs.forEach((r) => {
        if (r.departureAirport) airports.add(r.departureAirport);
        if (r.arrivalAirport) airports.add(r.arrivalAirport);
      });
      setReviews(docs);
      setStats({ flights: docs.length, airports: airports.size, airlines: airlines.size });
    });
    return unsubscribe;
  }, [targetUserId]);

  useEffect(() => {
    if (!firebaseReady) return;
    const unsubscribe = onSnapshot(collection(db, 'users', targetUserId, 'badges'), (snap) => {
      setEarnedBadgeKeys(snap.docs.map((d) => d.id));
    });
    return unsubscribe;
  }, [targetUserId]);

  const loadFollowCounts = async () => {
    if (!firebaseReady) return;
    const [followersSnap, followingSnap] = await Promise.all([
      getCountFromServer(collection(db, 'users', targetUserId, 'followers')),
      getCountFromServer(collection(db, 'users', targetUserId, 'following')),
    ]);
    setFollowCounts({ followers: followersSnap.data().count, following: followingSnap.data().count });
  };

  useEffect(() => {
    loadFollowCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  const saveBio = () => {
    setEditingBio(false);
    setDoc(doc(db, 'users', user.uid), { bio: bioDraft }, { merge: true }).catch(() => {});
  };

  const selectFavoriteAirline = (code) => {
    setEditingFavorite(null);
    setDoc(doc(db, 'users', user.uid), { favoriteAirlineCode: code }, { merge: true }).catch(() => {});
  };

  const selectFavoriteAircraft = (label) => {
    setEditingFavorite(null);
    setDoc(doc(db, 'users', user.uid), { favoriteAircraftType: label }, { merge: true }).catch(() => {});
  };

  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setDoc(doc(db, 'users', user.uid), { photoURL: result.assets[0].uri }, { merge: true }).catch(() => {});
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {!isOwnProfile ? (
        <ScreenHeader title={profile?.username || 'profile'} onBack={onBack} />
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 16 }}>
          <View>
            <Pressable onPress={() => setMenuOpen((v) => !v)} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
            </Pressable>
            {menuOpen && (
              <View
                style={{
                  position: 'absolute',
                  top: 28,
                  right: 0,
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  paddingVertical: 4,
                  minWidth: 140,
                  zIndex: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Pressable
                  onPress={() => {
                    setMenuOpen(false);
                    setEditingBio(true);
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 14 }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: 13 }}>Edit bio</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMenuOpen(false);
                    onOpenInvite();
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 14 }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: 13 }}>Invite friends</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMenuOpen(false);
                    onOpenUpcomingFlights();
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 14 }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: 13 }}>Upcoming flights</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMenuOpen(false);
                    onOpenAccount();
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 14 }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: 13 }}>Account</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: isOwnProfile ? 4 : 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <View style={{ marginBottom: 10 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.avatarPlaceholders[0],
                overflow: 'hidden',
              }}
            >
              {profile?.photoURL && (
                <Image source={{ uri: profile.photoURL }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              )}
            </View>
            {isOwnProfile && (
              <Pressable
                onPress={pickProfilePhoto}
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.accentFill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.background,
                }}
              >
                <Ionicons name="add" size={16} color={colors.onAccentFill} />
              </Pressable>
            )}
          </View>
          <Text style={{ fontSize: 16, fontWeight: '500', color: colors.textPrimary }}>
            {isOwnProfile ? user.email : profile?.username || 'pilot'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 32, marginBottom: 14 }}>
          <StatColumn label="posts" value={stats.flights} onPress={() => onOpenPosts(targetUserId)} />
          <StatColumn
            label="followers"
            value={followCounts.followers}
            onPress={() => onOpenFollowList(targetUserId, 'followers')}
          />
          <StatColumn
            label="following"
            value={followCounts.following}
            onPress={() => onOpenFollowList(targetUserId, 'following')}
          />
        </View>

        {!isOwnProfile && (
          <View style={{ marginBottom: 16, alignItems: 'center' }}>
            <FollowButton currentUserId={user.uid} targetUserId={targetUserId} onChange={loadFollowCounts} />
          </View>
        )}

        {editingBio ? (
          <View style={{ marginBottom: 18 }}>
            <TextInput
              value={bioDraft}
              onChangeText={setBioDraft}
              autoFocus
              placeholder="Add a bio"
              placeholderTextColor={colors.textMuted}
              multiline
              style={{
                fontSize: 13,
                color: colors.textPrimary,
                minHeight: 36,
                textAlignVertical: 'top',
              }}
            />
            {/* Explicit buttons instead of relying on onBlur — blur wasn't
                reliably firing before the bio could actually be saved. */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 8 }}>
              <Pressable
                onPress={() => {
                  setBioDraft(profile?.bio ?? '');
                  setEditingBio(false);
                }}
              >
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveBio}>
                <Text style={{ color: colors.accentText, fontSize: 13, fontWeight: '500' }}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text
            style={{
              fontSize: 13,
              color: profile?.bio ? colors.textPrimary : colors.textMuted,
              marginBottom: 18,
              textAlign: 'center',
              lineHeight: 18,
            }}
          >
            {profile?.bio || (isOwnProfile ? 'Add a bio' : '')}
          </Text>
        )}

        {earnedBadgeKeys.length > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
            {BADGES.filter((b) => earnedBadgeKeys.includes(b.key)).map((badge) => (
              <Pressable
                key={badge.key}
                onPress={() => Alert.alert(badge.title, badge.description)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: colors.accentFill,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={badge.icon} size={16} color={colors.onAccentFill} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
          <FavoriteLogoSlot
            label="Favorite airline"
            uri={getAirlineLogoUrl(profile?.favoriteAirlineCode)}
            editable={isOwnProfile}
            onPick={() => setEditingFavorite((v) => (v === 'airline' ? null : 'airline'))}
            background="#FFFFFF"
            imageResizeMode="contain"
          />
          <FavoriteLogoSlot
            label="Favorite aircraft"
            uri={favoriteAircraftPhoto}
            editable={isOwnProfile}
            onPick={() => setEditingFavorite((v) => (v === 'aircraft' ? null : 'aircraft'))}
          />
        </View>

        {/* Inline, in-flow panels instead of RN's Modal component — Modal
            wasn't closing reliably (confirmed on a real device, not just
            react-native-web), so this uses the same plain-View pattern
            already proven to work for the ⋯ menu and bio editing above. */}
        {editingFavorite === 'airline' && (
          <View style={{ marginBottom: 20, backgroundColor: colors.surface, borderRadius: 10, padding: 12, maxHeight: 280 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>Favorite airline</Text>
              <Pressable onPress={() => setEditingFavorite(null)} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
              {COMMON_AIRLINES.map((item) => (
                <Pressable
                  key={item.code}
                  onPress={() => selectFavoriteAirline(item.code)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
                >
                  <Image source={{ uri: getAirlineLogoUrl(item.code) }} style={{ width: 26, height: 26, borderRadius: 6 }} />
                  <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {editingFavorite === 'aircraft' && (
          <View style={{ marginBottom: 20, backgroundColor: colors.surface, borderRadius: 10, padding: 12, maxHeight: 280 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>Favorite aircraft</Text>
              <Pressable onPress={() => setEditingFavorite(null)} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
              {COMMON_AIRCRAFT.map((item) => (
                <AircraftPickerRow key={item.label} item={item} onSelect={selectFavoriteAircraft} />
              ))}
            </ScrollView>
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 32,
            marginBottom: 20,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <StatColumn label="flights" value={stats.flights} onPress={() => onOpenPosts(targetUserId)} />
          <StatColumn label="airports" value={stats.airports} onPress={() => onOpenStatList(targetUserId, 'airports')} />
          <StatColumn label="airlines" value={stats.airlines} onPress={() => onOpenStatList(targetUserId, 'airlines')} />
        </View>

        <PostGrid reviews={reviews} onOpenReview={onOpenReview} />
      </ScrollView>
    </View>
  );
}
