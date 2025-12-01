import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import NfcHandlerScreen from '../screens/NfcHandler/NfcHandlerScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import BinderListScreen from '../screens/BinderList/BinderListScreen';
import BinderDetailScreen from '../screens/BinderDetail/BinderDetailScreen';
import CardListScreen from '../screens/CardList/CardListScreen';

export type MainStackParamList = {
  NfcHandler: { tagId?: string } | undefined;
  Questionnaire: { nfcTagId?: string } | undefined;
  BinderList: undefined;
  BinderDetail: { binderId: string };
  CardList: undefined;
};

const Stack = createStackNavigator<MainStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
      }}
      initialRouteName="NfcHandler"
    >
      <Stack.Screen
        name="NfcHandler"
        component={NfcHandlerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Questionnaire"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BinderList"
        component={BinderListScreen}
        options={{ title: 'My Binders' }}
      />
      <Stack.Screen
        name="BinderDetail"
        component={BinderDetailScreen}
        options={{ title: 'Binder' }}
      />
      <Stack.Screen
        name="CardList"
        component={CardListScreen}
        options={{ title: 'Cards' }}
      />
    </Stack.Navigator>
  );
}

