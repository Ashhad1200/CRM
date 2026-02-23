/**
 * Sync conflicts screen — shows conflicting records side-by-side.
 *
 * For each conflict, the user can:
 * - Keep local version
 * - Keep server version
 * - View field-by-field differences
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useSyncStore, type SyncConflict } from '../stores/sync-store';

export function SyncConflictsScreen() {
  const { conflicts, resolveConflict } = useSyncStore();

  const handleKeepLocal = useCallback(
    (conflict: SyncConflict) => {
      Alert.alert(
        'Keep Local Version',
        `This will overwrite the server version of this ${conflict.table} record. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Keep Local',
            style: 'destructive',
            onPress: () => {
              // In production: push local record to server with force flag
              // await apiClient('/sync/resolve', { method: 'POST', body: JSON.stringify({
              //   conflictId: conflict.id, resolution: 'keep_local', record: conflict.localRecord
              // })});
              resolveConflict(conflict.id);
            },
          },
        ],
      );
    },
    [resolveConflict],
  );

  const handleKeepServer = useCallback(
    (conflict: SyncConflict) => {
      Alert.alert(
        'Keep Server Version',
        `This will discard your local changes to this ${conflict.table} record. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Keep Server',
            onPress: () => {
              // In production: apply server record to local WatermelonDB
              resolveConflict(conflict.id);
            },
          },
        ],
      );
    },
    [resolveConflict],
  );

  const renderDiffs = (local: Record<string, unknown>, server: Record<string, unknown>) => {
    const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);
    const diffs: Array<{ key: string; localVal: string; serverVal: string; isDifferent: boolean }> = [];

    for (const key of allKeys) {
      if (key === 'id' || key.startsWith('_')) continue;
      const localVal = String(local[key] ?? '—');
      const serverVal = String(server[key] ?? '—');
      diffs.push({ key, localVal, serverVal, isDifferent: localVal !== serverVal });
    }

    return diffs;
  };

  const renderConflict = ({ item }: { item: SyncConflict }) => {
    const diffs = renderDiffs(item.localRecord, item.serverRecord);
    const changedCount = diffs.filter((d) => d.isDifferent).length;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.tableBadge}>
            <Text style={styles.tableBadgeText}>{item.table}</Text>
          </View>
          <Text style={styles.conflictId}>ID: {item.id.slice(0, 8)}…</Text>
        </View>

        <Text style={styles.diffSummary}>{changedCount} field(s) differ</Text>

        <View style={styles.diffHeader}>
          <Text style={[styles.diffCol, styles.diffLabel]}>Field</Text>
          <Text style={[styles.diffCol, styles.localCol]}>Local</Text>
          <Text style={[styles.diffCol, styles.serverCol]}>Server</Text>
        </View>

        <ScrollView style={styles.diffScroll} nestedScrollEnabled>
          {diffs
            .filter((d) => d.isDifferent)
            .map((d) => (
              <View key={d.key} style={styles.diffRow}>
                <Text style={[styles.diffCol, styles.diffLabel]} numberOfLines={1}>
                  {d.key}
                </Text>
                <Text style={[styles.diffCol, styles.localCol, styles.diffValue]} numberOfLines={2}>
                  {d.localVal}
                </Text>
                <Text style={[styles.diffCol, styles.serverCol, styles.diffValue]} numberOfLines={2}>
                  {d.serverVal}
                </Text>
              </View>
            ))}
        </ScrollView>

        <View style={styles.timestamps}>
          <Text style={styles.timestamp}>Local: {item.localUpdatedAt}</Text>
          <Text style={styles.timestamp}>Server: {item.serverUpdatedAt}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.localButton]}
            onPress={() => handleKeepLocal(item)}
          >
            <Text style={styles.localButtonText}>Keep Local</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.serverButton]}
            onPress={() => handleKeepServer(item)}
          >
            <Text style={styles.serverButtonText}>Keep Server</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (conflicts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>✅</Text>
        <Text style={styles.emptyTitle}>No Conflicts</Text>
        <Text style={styles.emptySubtitle}>All records are in sync.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{conflicts.length} Conflict(s)</Text>
        <Text style={styles.headerSubtitle}>
          Review each conflict and choose which version to keep.
        </Text>
      </View>
      <FlatList
        data={conflicts}
        keyExtractor={(item) => item.id}
        renderItem={renderConflict}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  list: { padding: 16 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tableBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tableBadgeText: { color: '#1e40af', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  conflictId: { color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' },
  diffSummary: { color: '#ef4444', fontSize: 13, fontWeight: '500', marginBottom: 12 },

  diffHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 6, marginBottom: 4 },
  diffRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  diffCol: { flex: 1, fontSize: 12 },
  diffLabel: { fontWeight: '600', color: '#475569' },
  localCol: { color: '#ea580c' },
  serverCol: { color: '#2563eb' },
  diffValue: { fontFamily: 'monospace' },
  diffScroll: { maxHeight: 200 },

  timestamps: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  timestamp: { fontSize: 11, color: '#94a3b8' },

  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  localButton: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ea580c' },
  localButtonText: { color: '#ea580c', fontWeight: '600', fontSize: 14 },
  serverButton: { backgroundColor: '#1e40af' },
  serverButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8fafc' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  emptySubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
});
