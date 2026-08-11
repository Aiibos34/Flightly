import { useState } from 'react';
import {
  Text,
  View,
  TextInput,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@firebase/auth';
import { auth, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import { applyReferralCode } from '../utils/referral';

export default function AuthScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Enter an email and password.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (referralCode.trim()) {
          // Non-critical — an invalid/mistyped code shouldn't block signup.
          applyReferralCode(credential.user.uid, referralCode).catch(() => {});
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setBusy(false);
    }
  };

  if (!firebaseReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ color: '#E24B4A', textAlign: 'center' }}>
            Firebase is not configured yet. Add your Firebase config values to the .env file,
            then restart the dev server.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={{ fontSize: 32, fontWeight: '500', color: colors.accentText, marginBottom: 4 }}>
          flightly
        </Text>
        <Text style={{ fontSize: 15, color: colors.textSecondary, marginBottom: 24 }}>
          {mode === 'login' ? 'Log in to continue' : 'Create an account'}
        </Text>

        <TextInput
          style={{
            width: '100%',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            marginBottom: 12,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
          }}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={{
            width: '100%',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            marginBottom: 12,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
          }}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {mode === 'signup' && (
          <TextInput
            style={{
              width: '100%',
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
              marginBottom: 12,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
            }}
            placeholder="Invite code (optional)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            value={referralCode}
            onChangeText={setReferralCode}
          />
        )}

        {error && <Text style={{ color: '#E24B4A', marginBottom: 12, textAlign: 'center' }}>{error}</Text>}

        <Pressable
          style={{
            width: '100%',
            backgroundColor: colors.accentFill,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: 4,
            opacity: busy ? 0.6 : 1,
          }}
          onPress={submit}
          disabled={busy}
        >
          <Text style={{ color: colors.onAccentFill, fontSize: 16, fontWeight: '500' }}>
            {busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </Text>
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          <Text style={{ color: colors.textSecondary, marginTop: 18, textAlign: 'center' }}>
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/email-already-in-use':
      return 'An account with that email already exists — try logging in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
