import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { ContactsStackParamList } from '../navigation/types';

type DetailRoute = RouteProp<ContactsStackParamList, 'ContactDetail'>;

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
}

export default function ContactDetailScreen() {
  const route = useRoute<DetailRoute>();
  const { id } = route['params'];

  const [contact] = useState<ContactDetail>({
    id,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    title: '',
  });

  const [notes, setNotes] = useState('');

  const fields: { label: string; value: string }[] = [
    { label: 'Name', value: `${contact['firstName']} ${contact['lastName']}`.trim() },
    { label: 'Email', value: contact['email'] },
    { label: 'Phone', value: contact['phone'] },
    { label: 'Company', value: contact['company'] },
    { label: 'Title', value: contact['title'] },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {contact['firstName'].charAt(0) || '?'}
            {contact['lastName'].charAt(0) || ''}
          </Text>
        </View>
        <Text style={styles.headerName}>
          {contact['firstName']} {contact['lastName']}
        </Text>
        {contact['title'] ? (
          <Text style={styles.headerTitle}>{contact['title']}</Text>
        ) : null}

        <TouchableOpacity style={styles.editButton} activeOpacity={0.7}>
          <Text style={styles.editButtonText}>Edit Contact</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        {fields.map((f) => (
          <View style={styles.fieldRow} key={f['label']}>
            <Text style={styles.fieldLabel}>{f['label']}</Text>
            <Text style={styles.fieldValue}>{f['value'] || '—'}</Text>
          </View>
        ))}
      </View>

      {/* Activities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activities</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No activities yet</Text>
        </View>
      </View>

      {/* Associated Deals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Associated Deals</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No deals linked</Text>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add notes about this contact…"
          placeholderTextColor="#94a3b8"
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e40af',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  headerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerTitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  editButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1e40af',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  fieldLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  placeholder: {
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 100,
  },
  bottomSpacer: {
    height: 40,
  },
});
