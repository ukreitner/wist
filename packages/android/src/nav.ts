import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Lobby: undefined;
  PassCards: undefined;
  Auction: undefined;
  Betting: undefined;
  Play: undefined;
  Score: undefined;
};

export type NavProps<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;
