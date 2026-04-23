import 'react-native-gesture-handler';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import HomeScreen from './src/screens/HomeScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import PassCardsScreen from './src/screens/PassCardsScreen';
import AuctionScreen from './src/screens/AuctionScreen';
import BettingScreen from './src/screens/BettingScreen';
import PlayScreen from './src/screens/PlayScreen';
import ScoreScreen from './src/screens/ScoreScreen';
import type { RootStackParamList } from './src/nav';
import { DemoStateProvider, useDemoState } from './src/demo-state';

const Stack = createNativeStackNavigator<RootStackParamList>();

function routeForSnapshot(snapshot: ReturnType<typeof useDemoState>['snapshot']): keyof RootStackParamList {
  if (!snapshot) {
    return 'Home';
  }

  if (snapshot.roomStatus === 'lobby') {
    return 'Lobby';
  }

  if (snapshot.roomStatus === 'ended' || snapshot.match.awaitingNextHand || snapshot.match.status === 'ended') {
    return 'Score';
  }

  switch (snapshot.match.currentHand?.phase) {
    case 'passing':
      return 'PassCards';
    case 'auction':
      return 'Auction';
    case 'betting':
      return 'Betting';
    case 'playing':
      return 'Play';
    default:
      return 'Lobby';
  }
}

function AppNavigator() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const { snapshot } = useDemoState();

  useEffect(() => {
    if (!navigationRef.isReady()) {
      return;
    }

    const nextRoute = routeForSnapshot(snapshot);
    const currentRoute = navigationRef.getCurrentRoute()?.name;

    if (currentRoute === nextRoute) {
      return;
    }

    navigationRef.reset({
      index: 0,
      routes: [{ name: nextRoute }]
    });
  }, [navigationRef, snapshot]);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0e2019' } }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Lobby" component={LobbyScreen} />
        <Stack.Screen name="PassCards" component={PassCardsScreen} />
        <Stack.Screen name="Auction" component={AuctionScreen} />
        <Stack.Screen name="Betting" component={BettingScreen} />
        <Stack.Screen name="Play" component={PlayScreen} />
        <Stack.Screen name="Score" component={ScoreScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DemoStateProvider>
        <AppNavigator />
      </DemoStateProvider>
    </SafeAreaProvider>
  );
}
