import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import PassCardsScreen from './src/screens/PassCardsScreen';
import AuctionScreen from './src/screens/AuctionScreen';
import BettingScreen from './src/screens/BettingScreen';
import PlayScreen from './src/screens/PlayScreen';
import ScoreScreen from './src/screens/ScoreScreen';
import type { RootStackParamList } from './src/nav';
import { DemoStateProvider } from './src/demo-state';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <DemoStateProvider>
        <NavigationContainer>
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
      </DemoStateProvider>
    </SafeAreaProvider>
  );
}
