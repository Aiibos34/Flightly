import { useEffect, useState } from 'react';
import { View, Text, Pressable, Share, ActivityIndicator } from 'react-native';
import { collection, query, where, getCountFromServer } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import { ensureReferralCode } from '../utils/referral';

export default function InviteFriendsScreen({ user, onBack }) {
  const { colors } = useTheme();
  const [code, setCode] = useState(null);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    ensureReferralCode(user.uid).then(setCode).catch(() => {});
  }, [user.uid]);

  useEffect(() => {
    if (!firebaseReady) return;
    getCountFromServer(query(collection(db, 'referrals'), where('referrerUserId', '==', user.uid)))
      .then((snap) => setReferralCount(snap.data().count))
      .catch(() => {});
  }, [user.uid]);

  const share = () => {
    if (!code) return;
    Share.share({
      message: `Join me on flightly and log your flights! Use my invite code ${code} when you sign up.`,
    }).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Invite friends" onBack={onBack} />
      <View style={{ padding: 16, alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          Share your code — when a friend signs up with it, you both earn a badge.
        </Text>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            paddingVertical: 24,
            paddingHorizontal: 32,
            alignItems: 'center',
            marginBottom: 24,
            borderWidth: 1,
            borderColor: colors.border,
            minWidth: 200,
          }}
        >
          {code ? (
            <Text style={{ fontSize: 28, fontWeight: '700', letterSpacing: 4, color: colors.accentText }}>{code}</Text>
          ) : (
            <ActivityIndicator color={colors.accentText} />
          )}
        </View>

        <Pressable
          onPress={share}
          disabled={!code}
          style={{
            backgroundColor: colors.accentFill,
            paddingVertical: 14,
            paddingHorizontal: 32,
            borderRadius: 10,
            opacity: code ? 1 : 0.6,
            marginBottom: 24,
          }}
        >
          <Text style={{ color: colors.onAccentFill, fontSize: 15, fontWeight: '500' }}>Share invite</Text>
        </Pressable>

        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {referralCount} friend{referralCount === 1 ? '' : 's'} joined using your code
        </Text>
      </View>
    </View>
  );
}
