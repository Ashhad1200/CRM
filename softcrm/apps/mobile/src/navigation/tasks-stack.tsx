import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TaskListScreen } from '../screens/task-list';
import type { TasksStackParamList } from './types';

const Stack = createNativeStackNavigator<TasksStackParamList>();

export function TasksStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1e40af' }, headerTintColor: '#ffffff' }}>
      <Stack.Screen name="TaskList" component={TaskListScreen} options={{ title: 'Tasks' }} />
    </Stack.Navigator>
  );
}
