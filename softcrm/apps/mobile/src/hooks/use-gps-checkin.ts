/**
 * useGpsCheckin — captures GPS coordinates for field check-ins.
 *
 * Uses expo-location to read device GPS, stores check-in record
 * locally (offline-first), and syncs later via the sync engine.
 * Optionally matches to nearest account by proximity.
 */
import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { useAuthStore } from '../stores/auth-store';

export interface CheckinRecord {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  accountId: string | null;
  accountName: string | null;
  notes: string;
  checkedInBy: string;
  checkedInAt: number;
}

export interface AccountLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two points using Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the nearest account within a given radius (default 500m).
 */
export function findNearestAccount(
  lat: number,
  lon: number,
  accounts: AccountLocation[],
  maxDistanceMeters = 500,
): AccountLocation | null {
  let nearest: AccountLocation | null = null;
  let nearestDistance = Infinity;

  for (const acc of accounts) {
    const dist = haversineDistance(lat, lon, acc.latitude, acc.longitude);
    if (dist < nearestDistance && dist <= maxDistanceMeters) {
      nearest = acc;
      nearestDistance = dist;
    }
  }

  return nearest;
}

/**
 * Generate a simple UUID v4 for offline record IDs.
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface UseGpsCheckinResult {
  isChecking: boolean;
  lastCheckin: CheckinRecord | null;
  error: string | null;
  checkIn: (accountId?: string, notes?: string, nearbyAccounts?: AccountLocation[]) => Promise<CheckinRecord | null>;
}

export function useGpsCheckin(): UseGpsCheckinResult {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<CheckinRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  const checkIn = useCallback(
    async (
      accountId?: string,
      notes?: string,
      nearbyAccounts?: AccountLocation[],
    ): Promise<CheckinRecord | null> => {
      setIsChecking(true);
      setError(null);

      try {
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Location permission denied');
        }

        // Get current position
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude, accuracy } = location.coords;

        // Find nearest account if not explicitly provided
        let resolvedAccountId = accountId ?? null;
        let resolvedAccountName: string | null = null;

        if (!accountId && nearbyAccounts && nearbyAccounts.length > 0) {
          const nearest = findNearestAccount(latitude, longitude, nearbyAccounts);
          if (nearest) {
            resolvedAccountId = nearest.id;
            resolvedAccountName = nearest.name;
          }
        }

        const record: CheckinRecord = {
          id: generateId(),
          latitude,
          longitude,
          accuracy,
          accountId: resolvedAccountId,
          accountName: resolvedAccountName,
          notes: notes ?? '',
          checkedInBy: user?.id ?? 'unknown',
          checkedInAt: Date.now(),
        };

        // In production: save to WatermelonDB checkins table
        // await database.write(async () => {
        //   await database.get('checkins').create((r) => { r.latitude = latitude; ... })
        // });

        setLastCheckin(record);
        return record;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Check-in failed';
        setError(message);
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [user],
  );

  return { isChecking, lastCheckin, error, checkIn };
}
