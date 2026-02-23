import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ContactListScreen } from '../screens/contact-list';
import { ContactDetailScreen } from '../screens/contact-detail';
import type { ContactsStackParamList } from './types';

const Stack = createNativeStackNavigator<ContactsStackParamList>();

export function ContactsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1e40af' }, headerTintColor: '#ffffff' }}>
      <Stack.Screen name="ContactList" component={ContactListScreen} options={{ title: 'Contacts' }} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} options={{ title: 'Contact' }} />
    </Stack.Navigator>
  );
}
