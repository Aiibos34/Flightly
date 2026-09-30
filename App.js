import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from '@firebase/auth';
import { doc, setDoc } from '@firebase/firestore';
import { auth, db, firebaseReady } from './firebase';
import { ThemeProvider, useTheme } from './theme';
import { ToastProvider } from './components/Toast';
import ScreenTransition from './components/ScreenTransition';
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
import StatListScreen from './screens/StatListScreen';
import InviteFriendsScreen from './screens/InviteFriendsScreen';
import AirportDetailScreen from './screens/AirportDetailScreen';
import AirlineDetailScreen from './screens/AirlineDetailScreen';
import UpcomingFlightsScreen from './screens/UpcomingFlightsScreen';
import StoryComposerScreen from './screens/StoryComposerScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';

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
        <ToastProvider>
          <Root checkingAuth={checkingAuth} user={user} />
        </ToastProvider>
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
  const openStatList = (userId, type) => openScreen('statList', { userId, type });
  const openInvite = () => openScreen('invite');
  const openAirportDetail = (code, profileUserId) => openScreen('airportDetail', { code, profileUserId });
  const openAirlineDetail = (airline, profileUserId) => openScreen('airlineDetail', { airline, profileUserId });
  const openUpcomingFlights = () => openScreen('upcomingFlights');
  const openStoryComposer = () => openScreen('storyComposer');
  const openChatList = () => openScreen('chatList');
  const openChat = (chatId, otherUserId, otherUsername) => openScreen('chat', { chatId, otherUserId, otherUsername });

  let content;
  let transitionKey = screen?.name || tab;

  if (screen?.name === 'story') {
    content = (
      <StoryViewerScreen
        user={user}
        stories={screen.params.stories}
        initialIndex={screen.params.index}
        onBack={closeScreen}
        onOpenChat={openChat}
      />
    );
  } else if (screen?.name === 'storyComposer') {
    content = <StoryComposerScreen user={user} onBack={closeScreen} onDone={closeScreen} />;
  } else if (screen?.name === 'chatList') {
    content = <ChatListScreen user={user} onBack={closeScreen} onOpenChat={openChat} />;
  } else if (screen?.name === 'chat') {
    content = (
      <ChatScreen
        user={user}
        chatId={screen.params.chatId}
        otherUserId={screen.params.otherUserId}
        otherUsername={screen.params.otherUsername}
        onBack={closeScreen}
      />
    );
  } else if (screen?.name === 'reviewDetail') {
    content = (
      <FlightReviewDetailScreen
        reviewId={screen.params.reviewId}
        user={user}
        onBack={closeScreen}
        onOpenComments={openComments}
        onOpenProfile={openProfile}
        onEditReview={(review) => openScreen('editReview', { review })}
        onOpenAirport={(code) => openAirportDetail(code)}
        onOpenAirline={(airline) => openAirlineDetail(airline)}
      />
    );
  } else if (screen?.name === 'editReview') {
    content = (
      <NewFlightReviewScreen
        user={user}
        editingReview={screen.params.review}
        onBack={closeScreen}
        onDone={closeScreen}
      />
    );
  } else if (screen?.name === 'comments') {
    content = (
      <CommentsScreen reviewId={screen.params.reviewId} user={user} onBack={closeScreen} onOpenProfile={openProfile} />
    );
  } else if (screen?.name === 'flightHistory') {
    content = (
      <FlightHistoryScreen
        user={user}
        profileUserId={screen.params?.profileUserId}
        onBack={closeScreen}
        onOpenReview={openReview}
      />
    );
  } else if (screen?.name === 'account') {
    content = <AccountScreen onBack={closeScreen} onOpenHistory={() => openScreen('flightHistory')} />;
  } else if (screen?.name === 'followList') {
    content = (
      <FollowListScreen
        userId={screen.params.userId}
        type={screen.params.type}
        onBack={closeScreen}
        onOpenProfile={openProfile}
      />
    );
  } else if (screen?.name === 'statList') {
    const listUserId = screen.params.userId;
    content = (
      <StatListScreen
        user={user}
        profileUserId={listUserId}
        type={screen.params.type}
        onBack={closeScreen}
        onOpenDetail={(type, value) =>
          type === 'airports' ? openAirportDetail(value, listUserId) : openAirlineDetail(value, listUserId)
        }
      />
    );
  } else if (screen?.name === 'invite') {
    content = <InviteFriendsScreen user={user} onBack={closeScreen} />;
  } else if (screen?.name === 'upcomingFlights') {
    content = <UpcomingFlightsScreen user={user} onBack={closeScreen} />;
  } else if (screen?.name === 'airportDetail') {
    content = (
      <AirportDetailScreen
        user={user}
        profileUserId={screen.params.profileUserId}
        code={screen.params.code}
        onBack={closeScreen}
        onOpenReview={openReview}
      />
    );
  } else if (screen?.name === 'airlineDetail') {
    content = (
      <AirlineDetailScreen
        user={user}
        profileUserId={screen.params.profileUserId}
        airline={screen.params.airline}
        onBack={closeScreen}
        onOpenReview={openReview}
      />
    );
  } else if (screen?.name === 'userProfile') {
    content = (
      <ProfileScreen
        user={user}
        profileUserId={screen.params.userId}
        onBack={closeScreen}
        onOpenReview={openReview}
        onOpenPosts={openPosts}
        onOpenFollowList={openFollowList}
        onOpenStatList={openStatList}
      />
    );
  } else {
    content = (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {tab === 'feed' && (
            <FeedScreen
              user={user}
              onOpenStory={(stories, index) => openScreen('story', { stories, index })}
              onOpenStoryComposer={openStoryComposer}
              onOpenChatList={openChatList}
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
              onOpenInvite={openInvite}
              onOpenUpcomingFlights={openUpcomingFlights}
              onOpenReview={openReview}
              onOpenPosts={openPosts}
              onOpenFollowList={openFollowList}
              onOpenStatList={openStatList}
            />
          )}
        </View>
        <BottomNav active={tab} onChange={setTab} />
      </View>
    );
  }

  return <ScreenTransition key={transitionKey}>{content}</ScreenTransition>;
}
