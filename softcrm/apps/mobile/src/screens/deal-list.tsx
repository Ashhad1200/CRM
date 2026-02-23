import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DealsStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<DealsStackParamList>;

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  contactName: string;
  probability: number;
}

const PIPELINE_STAGES = [
  'All',
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

function formatCurrency(value: number, currency: string): string {
  return `${currency === 'USD' ? '$' : currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

const SAMPLE_DEALS: Deal[] = [];

export default function DealListScreen() {
  const navigation = useNavigation<Navigation>();
  const [deals] = useState<Deal[]>(SAMPLE_DEALS);
  const [activeStage, setActiveStage] = useState<string>('All');

  const filtered = useMemo(() => {
    if (activeStage === 'All') return deals;
    return deals.filter((d) => d['stage'] === activeStage);
  }, [deals, activeStage]);

  const renderStageChip = (stage: string) => {
    const active = activeStage === stage;
    return (
      <TouchableOpacity
        key={stage}
        style={[styles.chip, active && styles.chipActive]}
        activeOpacity={0.7}
        onPress={() => setActiveStage(stage)}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {stage}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: Deal }) => {
    const stageColor = STAGE_COLORS[item['stage']] ?? '#64748b';
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('DealDetail', { id: item['id'] })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item['title']}
          </Text>
          <View style={[styles.stageBadge, { backgroundColor: stageColor }]}>
            <Text style={styles.stageBadgeText}>{item['stage']}</Text>
          </View>
        </View>

        <Text style={styles.cardValue}>
          {formatCurrency(item['value'], item['currency'])}
        </Text>

        <View style={styles.cardBottom}>
          <Text style={styles.cardContact}>{item['contactName']}</Text>
          <Text style={styles.cardProbability}>{item['probability']}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deals</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {PIPELINE_STAGES.map((s) => renderStageChip(s))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💰</Text>
          <Text style={styles.emptyTitle}>No deals found</Text>
          <Text style={styles.emptySubtitle}>
            {activeStage === 'All'
              ? 'Create your first deal to get started'
              : `No deals in ${activeStage} stage`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item['id']}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e40af',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  chipRow: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 10,
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardContact: {
    fontSize: 13,
    color: '#64748b',
  },
  cardProbability: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
