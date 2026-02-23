/**
 * Main tab navigator — Contacts, Deals, Tasks, More.
 * Each tab uses its own stack navigator for screen depth.   
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ContactsStack } from './contacts-stack';
import { DealsStack } from './deals-stack';
import { TasksStack } from './tasks-stack';
import { MoreStack } from './more-stack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1e40af',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
        },
      }}
    >
      <Tab.Screen
        name="ContactsTab"
        component={ContactsStack}
        options={{ tabBarLabel: 'Contacts' }}
      />
      <Tab.Screen
        name="DealsTab"
        component={DealsStack}
        options={{ tabBarLabel: 'Deals' }}
      />
      <Tab.Screen
        name="TasksTab"
        component={TasksStack}
        options={{ tabBarLabel: 'Tasks' }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreStack}
        options={{ tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
}
