import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { DealsStackParamList } from '../navigation/types';

type DetailRoute = RouteProp<DealsStackParamList, 'DealDetail'>;

const STAGES = [
  'Prospect',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
] as const;

const STAGE_COLORS: Record<string, string> = {
  Prospect: '#6366f1',
  Qualified: '#0ea5e9',
  Proposal: '#f59e0b',
  Negotiation: '#f97316',
  Won: '#22c55e',
  Lost: '#ef4444',
};

interface DealDetail {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  contactName: string;
  accountName: string;
  expectedCloseDate: string;
  probability: number;
}

export default function DealDetailScreen() {
  const route = useRoute<DetailRoute>();
  const { id } = route['params'];

  const [deal, setDeal] = useState<DealDetail>({
    id,
    title: '',
    value: 0,
    currency: 'USD',
    stage: 'Prospect',
    contactName: '',
    accountName: '',
    expectedCloseDate: '',
    probability: 0,
  });

  const [notes, setNotes] = useState('');

  const stageColor = STAGE_COLORS[deal['stage']] ?? '#64748b';

  const handleMoveStage = () => {
    Alert.alert(
      'Move Stage',
      'Select a new pipeline stage:',
      [
        ...STAGES.map((stage) => ({
          text: stage,
          onPress: () => setDeal((prev) => ({ ...prev, stage })),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true },
    );
  };

  const fields: { label: string; value: string }[] = [
    { label: 'Title', value: deal['title'] },
    {
      label: 'Value',
      value: `${deal['currency'] === 'USD' ? '$' : deal['currency']} ${deal['value'].toLocaleString()}`,
    },
    { label: 'Contact', value: deal['contactName'] },
    { label: 'Account', value: deal['accountName'] },
    { label: 'Expected Close', value: deal['expectedCloseDate'] },
    { label: 'Probability', value: `${deal['probability']}%` },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{deal['title'] || 'Untitled Deal'}</Text>
        <View style={[styles.stageBadgeLarge, { backgroundColor: stageColor }]}>
          <Text style={styles.stageBadgeText}>{deal['stage']}</Text>
        </View>

        <TouchableOpacity
          style={styles.moveStageButton}
          activeOpacity={0.7}
          onPress={handleMoveStage}
        >
          <Text style={styles.moveStageButtonText}>Move Stage</Text>
        </TouchableOpacity>
      </View>

      {/* Deal Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deal Information</Text>
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

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add notes about this deal…"
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  stageBadgeLarge: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  stageBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  moveStageButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1e40af',
  },
  moveStageButtonText: {
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
