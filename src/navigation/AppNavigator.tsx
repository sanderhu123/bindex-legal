import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import BinderListScreen from '../screens/BinderList/BinderListScreen';
import BinderDetailScreen from '../screens/BinderDetail/BinderDetailScreen';
import BinderEditScreen from '../screens/BinderEdit/BinderEditScreen';
import CardListScreen from '../screens/CardList/CardListScreen';
import CardDetailScreen from '../screens/CardDetail/CardDetailScreen';
import CardSearchTestScreen from '../screens/CardSearchTest/CardSearchTestScreen';
import UpgradeScreen from '../screens/Upgrade/UpgradeScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import BinderSettingsScreen from '../screens/BinderSettings/BinderSettingsScreen';

export type MainStackParamList = {
  Questionnaire: undefined;
  BinderList: undefined;
  BinderDetail: { binderId: string };
  BinderEdit: { binderId: string };
  BinderSettings: { binderId: string };
  CardList: undefined;
  CardDetail: { 
    cardId: string; 
    binderId: string; 
    isOwned?: boolean;
    position?: number;
    collectionMode?: 'master-set' | 'region' | 'custom';
    isExtraCard?: boolean;
    cardIndex?: number;
    cardsPerPage?: number;
    regionSlotId?: string;
    cardData?: {
      id: string;
      name: string;
      number: string;
      set: string;
      rarity: string;
      illustrator: string;
      imageUrl?: string;
      imageUrlHiRes?: string;
      variant?: string;
      supertype?: string;
      setTotal?: string;
      pokedexNumber?: number;
      selectedCardId?: string;
    };
  };
  CardSearchTest: undefined;
  Upgrade: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<MainStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="BinderList"
    >
      <Stack.Screen
        name="Questionnaire"
        component={OnboardingScreen}
      />
      <Stack.Screen
        name="BinderList"
        component={BinderListScreen}
      />
      <Stack.Screen
        name="BinderDetail"
        component={BinderDetailScreen}
      />
      <Stack.Screen
        name="BinderEdit"
        component={BinderEditScreen}
      />
      <Stack.Screen
        name="BinderSettings"
        component={BinderSettingsScreen}
      />
      <Stack.Screen
        name="CardList"
        component={CardListScreen}
      />
      <Stack.Screen
        name="CardDetail"
        component={CardDetailScreen}
      />
      <Stack.Screen
        name="CardSearchTest"
        component={CardSearchTestScreen}
      />
      <Stack.Screen
        name="Upgrade"
        component={UpgradeScreen}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
      />
    </Stack.Navigator>
  );
}

