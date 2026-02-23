import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MoreStackParamList } from '../navigation/types';
import { performFullSync } from '../lib/sync-engine';
import { useAuthStore } from '../stores/auth-store';
import { clearPersistedAuth } from '../providers/auth-provider';
import { useSyncStore } from '../stores/sync-store';

type Navigation = NativeStackNavigationProp<MoreStackParamList>;

interface MenuItem {
  key: string;
  label: string;
  icon: string;
  badge?: number;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'gps-checkin', label: 'GPS Check-In', icon: '📍' },
  { key: 'capture-receipt', label: 'Capture Receipt', icon: '🧾' },
  { key: 'sync-conflicts', label: 'Sync Conflicts', icon: '⚠️', badge: 0 },
  { key: 'sync-now', label: 'Sync Now', icon: '🔄' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
  { key: 'logout', label: 'Logout', icon: '🚪' },
];

export default function MoreMenuScreen() {
  const navigation = useNavigation<Navigation>();
  const clearAuth = useAuthStore((s) => s['clearAuth']);
  const lastSyncedAt = useSyncStore((s) => s['lastSyncedAt']);

  const handlePress = async (key: string) => {
    switch (key) {
      case 'capture-receipt':
        navigation.navigate('ExpenseCapture');
        break;
      case 'sync-conflicts':
        navigation.navigate('SyncConflicts');
        break;
      case 'sync-now':
        try {
          await performFullSync();
          Alert.alert('Sync Complete', 'All data has been synced successfully.');
        } catch {
          Alert.alert('Sync Failed', 'Could not complete sync. Try again later.');
        }
        break;
      case 'logout':
        Alert.alert('Logout', 'Are you sure you want to log out?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              clearAuth();
              await clearPersistedAuth();
            },
          },
        ]);
        break;
      default:
        break;
    }
  };

  const formatLastSync = (): string => {
    if (!lastSyncedAt) return 'Never';
    const date = new Date(lastSyncedAt);
    return date.toLocaleString();
  };

  const renderItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.7}
      onPress={() => handlePress(item['key'])}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{item['icon']}</Text>
      </View>
      <Text
        style={[
          styles.menuLabel,
          item['key'] === 'logout' && styles.menuLabelDanger,
        ]}
      >
        {item['label']}
      </Text>

      {item['badge'] != null && item['badge'] > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item['badge']}</Text>
        </View>
      ) : null}

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>More</Text>

      <FlatList
        data={MENU_ITEMS}
        keyExtractor={(item) => item['key']}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.syncInfo}>
        <Text style={styles.syncLabel}>Last synced</Text>
        <Text style={styles.syncTime}>{formatLastSync()}</Text>
      </View>
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
    paddingBottom: 16,
  },
  list: {
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 20,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  menuLabelDanger: {
    color: '#ef4444',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 22,
    color: '#cbd5e1',
    fontWeight: '300',
  },
  syncInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginHorizontal: 20,
  },
  syncLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  syncTime: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
});
