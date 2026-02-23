/**
 * GPS check-in tests — haversine distance + account proximity matching.
 */
import {
  haversineDistance,
  findNearestAccount,
  type AccountLocation,
} from '../hooks/use-gps-checkin';

// ─── Haversine distance ──────────────────────────────────────────────

describe('haversineDistance', () => {
  it('should return 0 for same point', () => {
    const dist = haversineDistance(40.7128, -74.006, 40.7128, -74.006);
    expect(dist).toBe(0);
  });

  it('should calculate distance between NYC and LA (~3940 km)', () => {
    const dist = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    // Should be approximately 3940 km
    expect(dist).toBeGreaterThan(3900000);
    expect(dist).toBeLessThan(4000000);
  });

  it('should calculate short distance between nearby points', () => {
    // Two points ~100m apart in Manhattan
    const dist = haversineDistance(40.7128, -74.006, 40.7129, -74.005);
    expect(dist).toBeGreaterThan(50);
    expect(dist).toBeLessThan(200);
  });

  it('should handle equator distance', () => {
    // 1 degree of longitude at equator ≈ 111 km
    const dist = haversineDistance(0, 0, 0, 1);
    expect(dist).toBeGreaterThan(110000);
    expect(dist).toBeLessThan(112000);
  });

  it('should handle poles', () => {
    const dist = haversineDistance(90, 0, -90, 0);
    // North pole to south pole ≈ 20,000 km
    expect(dist).toBeGreaterThan(19900000);
    expect(dist).toBeLessThan(20100000);
  });
});

// ─── Find nearest account ────────────────────────────────────────────

describe('findNearestAccount', () => {
  const accounts: AccountLocation[] = [
    { id: 'a1', name: 'Office A', latitude: 40.7128, longitude: -74.006 },
    { id: 'a2', name: 'Office B', latitude: 40.714, longitude: -74.008 },
    { id: 'a3', name: 'Office C', latitude: 41.0, longitude: -75.0 },
  ];

  it('should find the nearest account within default radius', () => {
    // Standing very close to Office A
    const result = findNearestAccount(40.7128, -74.0061, accounts);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('a1');
  });

  it('should find Office B when closer to it', () => {
    // Standing closer to Office B
    const result = findNearestAccount(40.7139, -74.0079, accounts);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('a2');
  });

  it('should return null when no accounts within radius', () => {
    // Standing far from all accounts
    const result = findNearestAccount(42.0, -76.0, accounts);
    expect(result).toBeNull();
  });

  it('should return null for empty accounts list', () => {
    const result = findNearestAccount(40.7128, -74.006, []);
    expect(result).toBeNull();
  });

  it('should respect custom max distance', () => {
    // Office A is ~10m away but maxDistance is 5m
    const result = findNearestAccount(40.7128, -74.0061, accounts, 5);
    expect(result).toBeNull();
  });

  it('should respect large custom max distance', () => {
    // Office C is ~30km away, use large radius
    const result = findNearestAccount(40.999, -74.999, accounts, 50000);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('a3');
  });
});

// ─── OCR extraction tests ────────────────────────────────────────────

describe('OCR extraction', () => {
  // Import OCR functions
  const { extractAmount, extractCurrency, extractVendor, extractDate, extractReceiptData } =
    require('../lib/ocr') as typeof import('../lib/ocr');

  describe('extractAmount', () => {
    it('should extract amount from "Total: $25.99"', () => {
      const result = extractAmount(['Some item $5.99', 'Total: $25.99']);
      expect(result).toBe(25.99);
    });

    it('should extract amount from "TOTAL 42.50"', () => {
      const result = extractAmount(['Items', 'TOTAL 42.50']);
      expect(result).toBe(42.5);
    });

    it('should extract amount with commas', () => {
      const result = extractAmount(['Grand Total: $1,234.56']);
      expect(result).toBe(1234.56);
    });

    it('should return null for no total found', () => {
      const result = extractAmount(['Hello world', 'No numbers here']);
      expect(result).toBeNull();
    });

    it('should prefer lines near the bottom', () => {
      const result = extractAmount([
        'Subtotal: $10.00',
        'Tax: $1.00',
        'Total: $11.00',
      ]);
      expect(result).toBe(11.0);
    });
  });

  describe('extractCurrency', () => {
    it('should detect EUR', () => {
      expect(extractCurrency('Total: €25.00')).toBe('EUR');
    });

    it('should detect GBP', () => {
      expect(extractCurrency('Amount: £15.00')).toBe('GBP');
    });

    it('should default to USD', () => {
      expect(extractCurrency('Total: $25.00')).toBe('USD');
    });
  });

  describe('extractVendor', () => {
    it('should extract first meaningful line as vendor', () => {
      const result = extractVendor(['Acme Corp', '123 Main St', 'Total: $25.00']);
      expect(result).toBe('Acme Corp');
    });

    it('should skip phone numbers', () => {
      const result = extractVendor(['(555) 123-4567', 'Best Coffee Shop']);
      expect(result).toBe('Best Coffee Shop');
    });

    it('should return null for empty lines', () => {
      const result = extractVendor([]);
      expect(result).toBeNull();
    });
  });

  describe('extractDate', () => {
    it('should extract MM/DD/YYYY date', () => {
      const result = extractDate('Date: 12/25/2024 Total: $50.00');
      expect(result).toBe('12/25/2024');
    });

    it('should extract YYYY-MM-DD date', () => {
      const result = extractDate('2024-01-15 Invoice');
      expect(result).toBe('2024-01-15');
    });

    it('should extract named month date', () => {
      const result = extractDate('January 15, 2024');
      expect(result).toBe('January 15, 2024');
    });

    it('should return null when no date found', () => {
      const result = extractDate('No date here');
      expect(result).toBeNull();
    });
  });

  describe('extractReceiptData', () => {
    it('should extract all fields from a sample receipt', () => {
      const receipt = `Acme Corp
123 Main St, Anytown
12/25/2024
Item 1    $10.00
Item 2    $15.00
Total: $25.00`;

      const result = extractReceiptData(receipt);
      expect(result.vendor).toBe('Acme Corp');
      expect(result.amount).toBe(25.0);
      expect(result.date).toBe('12/25/2024');
      expect(result.currency).toBe('USD');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle empty receipt', () => {
      const result = extractReceiptData('');
      expect(result.amount).toBeNull();
      expect(result.vendor).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });
});
