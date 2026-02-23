import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DealListScreen } from '../screens/deal-list';
import { DealDetailScreen } from '../screens/deal-detail';
import type { DealsStackParamList } from './types';

const Stack = createNativeStackNavigator<DealsStackParamList>();

export function DealsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1e40af' }, headerTintColor: '#ffffff' }}>
      <Stack.Screen name="DealList" component={DealListScreen} options={{ title: 'Deals' }} />
      <Stack.Screen name="DealDetail" component={DealDetailScreen} options={{ title: 'Deal' }} />
    </Stack.Navigator>
  );
}
