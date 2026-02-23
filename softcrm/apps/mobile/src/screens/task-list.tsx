import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface Task {
  id: string;
  title: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  contactName: string;
  dealTitle: string;
}

const FILTER_TABS = ['All', 'Pending', 'In Progress', 'Completed'] as const;

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  'In Progress': '#0ea5e9',
  Completed: '#22c55e',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#94a3b8',
  Medium: '#f59e0b',
  High: '#ef4444',
};

const SAMPLE_TASKS: Task[] = [];

export default function TaskListScreen() {
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);
  const [activeTab, setActiveTab] = useState<string>('All');

  const filtered = useMemo(() => {
    if (activeTab === 'All') return tasks;
    return tasks.filter((t) => t['status'] === activeTab);
  }, [tasks, activeTab]);

  const toggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t['id'] === id
          ? {
              ...t,
              status: t['status'] === 'Completed' ? 'Pending' : 'Completed',
            }
          : t,
      ),
    );
  };

  const renderTab = (tab: string) => {
    const active = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={[styles.tab, active && styles.tabActive]}
        activeOpacity={0.7}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[styles.tabText, active && styles.tabTextActive]}>
          {tab}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: Task }) => {
    const statusColor = STATUS_COLORS[item['status']] ?? '#64748b';
    const priorityColor = PRIORITY_COLORS[item['priority']] ?? '#94a3b8';
    const isCompleted = item['status'] === 'Completed';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            isCompleted && styles.checkboxChecked,
          ]}
          activeOpacity={0.7}
          onPress={() => toggleComplete(item['id'])}
        >
          {isCompleted ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : null}
        </TouchableOpacity>

        <View style={styles.cardBody}>
          <Text
            style={[
              styles.cardTitle,
              isCompleted && styles.cardTitleCompleted,
            ]}
            numberOfLines={2}
          >
            {item['title']}
          </Text>

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: statusColor }]}>
              <Text style={styles.badgeText}>{item['status']}</Text>
            </View>
            <View style={styles.priorityDot}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: priorityColor },
                ]}
              />
              <Text style={styles.priorityText}>{item['priority']}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {item['dueDate'] ? (
              <Text style={styles.metaText}>📅 {item['dueDate']}</Text>
            ) : null}
            {item['contactName'] ? (
              <Text style={styles.metaText}>👤 {item['contactName']}</Text>
            ) : null}
          </View>

          {item['dealTitle'] ? (
            <Text style={styles.dealText}>💰 {item['dealTitle']}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks</Text>

      <View style={styles.tabRow}>
        {FILTER_TABS.map((t) => renderTab(t))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No tasks found</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'All'
              ? 'Tap + to add your first task'
              : `No ${activeTab.toLowerCase()} tasks`}
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

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => {
          /* navigate to add task */
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  cardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  priorityDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
  },
  dealText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '500',
    marginTop: 2,
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
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e40af',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 30,
  },
});
