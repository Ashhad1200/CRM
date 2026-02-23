import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoreMenuScreen } from '../screens/more-menu';
import { ExpenseCaptureScreen } from '../screens/expense-capture';
import { SyncConflictsScreen } from '../screens/sync-conflicts';
import type { MoreStackParamList } from './types';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1e40af' }, headerTintColor: '#ffffff' }}>
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: 'More' }} />
      <Stack.Screen name="ExpenseCapture" component={ExpenseCaptureScreen} options={{ title: 'Capture Receipt' }} />
      <Stack.Screen name="SyncConflicts" component={SyncConflictsScreen} options={{ title: 'Sync Conflicts' }} />
    </Stack.Navigator>
  );
}
