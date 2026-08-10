import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from '@firebase/auth';
import { doc, setDoc } from '@firebase/firestore';
import { auth, db, firebaseReady } from './firebase';
import { ThemeProvider, useTheme } from './theme';
import BottomNav from './components/BottomNav';
import AuthScreen from './screens/AuthScreen';
import FeedScreen from './screens/FeedScreen';
import SearchScreen from './screens/SearchScreen';
import NewFlightReviewScreen from './screens/NewFlightReviewScreen';
import BadgesScreen from './screens/BadgesScreen';
import ProfileScreen from './screens/ProfileScreen';
import StoryViewerScreen from './screens/StoryViewerScreen';
import FlightReviewDetailScreen from './screens/FlightReviewDetailScreen';
import CommentsScreen from './screens/CommentsScreen';
import FlightHistoryScreen from './screens/FlightHistoryScreen';
import AccountScreen from './screens/AccountScreen';
import FollowListScreen from './screens/FollowListScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!firebaseReady) {
      setCheckingAuth(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setCheckingAuth(false);
      if (firebaseUser) {
        // Client-side Firebase Auth can't look up other users by email, so we
        // keep our own directory (same pattern as APP1) — now also the home
        // for profile fields (username, bio) since those need to be readable
        // when viewing someone else's profile, not just the review author line.
        setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            uid: firebaseUser.uid,
            email: firebaseUser.email?.toLowerCase() ?? null,
            username: firebaseUser.email ? firebaseUser.email.split('@')[0] : 'pilot',
          },
          { merge: true }
        ).catch((e) => console.warn('Failed to write user directory entry', e));
      }
    });
    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Root checkingAuth={checkingAuth} user={user} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function Root({ checkingAuth, user }) {
  const { colors, mode } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {checkingAuth ? null : user ? <Main user={user} /> : <AuthScreen />}
    </View>
  );
}

function Main({ user }) {
  // Same manual-state navigation pattern as APP1 — no navigation library.
  // `tab` is the active bottom-nav section; `screen` is an optional detail
  // view stacked on top of it (story viewer, review detail, comments, history,
  // another user's profile).
  const [tab, setTab] = useState('feed');
  const [screen, setScreen] = useState(null); // { name, params }

  const openScreen = (name, params) => setScreen({ name, params });
  const closeScreen = () => setScreen(null);

  const openReview = (reviewId) => openScreen('reviewDetail', { reviewId });
  const openComments = (reviewId) => openScreen('comments', { reviewId });
  const openProfile = (userId) => {
    if (userId === user.uid) {
      setScreen(null);
      setTab('profile');
      return;
    }
    openScreen('userProfile', { userId });
  };
  const openPosts = (userId) => openScreen('flightHistory', { profileUserId: userId });
  const openFollowList = (userId, type) => openScreen('followList', { userId, type });

  if (screen?.name === 'story') {
    return (
      <StoryViewerScreen
        story={screen.params.story}
        onBack={closeScreen}
        onOpenReview={openReview}
      />
    );
  }

  if (screen?.name === 'reviewDetail') {
    return (
      <FlightReviewDetailScreen
        reviewId={screen.params.reviewId}
        user={user}
        onBack={closeScreen}
        onOpenComments={openComments}
        onOpenProfile={openProfile}
        onEditReview={(review) => openScreen('editReview', { review })}
      />
    );
  }

  if (screen?.name === 'editReview') {
    return (
      <NewFlightReviewScreen
        user={user}
        editingReview={screen.params.review}
        onBack={closeScreen}
        onDone={closeScreen}
      />
    );
  }

  if (screen?.name === 'comments') {
    return (
      <CommentsScreen reviewId={screen.params.reviewId} user={user} onBack={closeScreen} onOpenProfile={openProfile} />
    );
  }

  if (screen?.name === 'flightHistory') {
    return (
      <FlightHistoryScreen
        user={user}
        profileUserId={screen.params?.profileUserId}
        onBack={closeScreen}
        onOpenReview={openReview}
      />
    );
  }

  if (screen?.name === 'account') {
    return (
      <AccountScreen onBack={closeScreen} onOpenHistory={() => openScreen('flightHistory')} />
    );
  }

  if (screen?.name === 'followList') {
    return (
      <FollowListScreen
        userId={screen.params.userId}
        type={screen.params.type}
        onBack={closeScreen}
        onOpenProfile={openProfile}
      />
    );
  }

  if (screen?.name === 'userProfile') {
    return (
      <ProfileScreen
        user={user}
        profileUserId={screen.params.userId}
        onBack={closeScreen}
        onOpenReview={openReview}
        onOpenPosts={openPosts}
        onOpenFollowList={openFollowList}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === 'feed' && (
          <FeedScreen
            user={user}
            onOpenStory={(story) => openScreen('story', { story })}
            onOpenReview={openReview}
            onOpenComments={openComments}
            onOpenProfile={openProfile}
          />
        )}
        {tab === 'search' && <SearchScreen onOpenReview={openReview} />}
        {tab === 'newReview' && (
          <NewFlightReviewScreen user={user} onDone={() => setTab('feed')} />
        )}
        {tab === 'badges' && <BadgesScreen user={user} />}
        {tab === 'profile' && (
          <ProfileScreen
            user={user}
            onOpenAccount={() => openScreen('account')}
            onOpenReview={openReview}
            onOpenPosts={openPosts}
            onOpenFollowList={openFollowList}
          />
        )}
      </View>
      <BottomNav active={tab} onChange={setTab} />
    </View>
  );
}
