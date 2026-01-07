import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import NfcHandlerScreen from '../screens/NfcHandler/NfcHandlerScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import BinderListScreen from '../screens/BinderList/BinderListScreen';
import BinderDetailScreen from '../screens/BinderDetail/BinderDetailScreen';
import CardListScreen from '../screens/CardList/CardListScreen';
import CardDetailScreen from '../screens/CardDetail/CardDetailScreen';
import CardSearchTestScreen from '../screens/CardSearchTest/CardSearchTestScreen';

export type MainStackParamList = {
  NfcHandler: { tagId?: string } | undefined;
  Questionnaire: { nfcTagId?: string } | undefined;
  BinderList: undefined;
  BinderDetail: { binderId: string };
  CardList: undefined;
  CardDetail: { 
    cardId: string; 
    binderId: string; 
    isOwned?: boolean; // Pass current state for optimistic display
    position?: number; // For Custom binders (slot position)
    collectionMode?: 'master-set' | 'region' | 'custom'; // Binder type
  };
  CardSearchTest: undefined; // Temporary test screen for Step 28A
};

const Stack = createStackNavigator<MainStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="NfcHandler"
    >
      <Stack.Screen
        name="NfcHandler"
        component={NfcHandlerScreen}
      />
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
    </Stack.Navigator>
  );
}

