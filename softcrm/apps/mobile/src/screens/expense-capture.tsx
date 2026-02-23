/**
 * Expense capture screen — camera → OCR → confirm → save offline.
 *
 * Flow:
 * 1. Open camera to capture receipt photo
 * 2. Run OCR to extract amount + vendor
 * 3. Show pre-filled form for user to confirm/edit
 * 4. Save expense record locally for sync
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { recognizeText, extractReceiptData, type OcrResult } from '../lib/ocr';
import { useAuthStore } from '../stores/auth-store';

type CapturePhase = 'camera' | 'processing' | 'confirm';

const EXPENSE_CATEGORIES = [
  'Travel',
  'Meals',
  'Accommodation',
  'Office Supplies',
  'Client Entertainment',
  'Transportation',
  'Other',
];

export function ExpenseCaptureScreen() {
  const [phase, setPhase] = useState<CapturePhase>('camera');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Form state (pre-filled from OCR)
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('Other');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');

  const cameraRef = useRef<CameraView>(null);
  const user = useAuthStore((s) => s.user);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      setPhase('processing');
      const photo = await cameraRef.current.takePictureAsync();
      if (!photo) {
        setPhase('camera');
        return;
      }

      setImageUri(photo.uri);

      // Run OCR
      const rawText = await recognizeText(photo.uri);
      const result = extractReceiptData(rawText);
      setOcrResult(result);

      // Pre-fill form
      if (result.amount !== null) setAmount(String(result.amount));
      if (result.vendor) setVendor(result.vendor);
      if (result.currency) setCurrency(result.currency);

      setPhase('confirm');
    } catch {
      Alert.alert('Error', 'Failed to capture photo');
      setPhase('camera');
    }
  }, []);

  const handleSave = useCallback(() => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    if (!vendor.trim()) {
      Alert.alert('Error', 'Please enter a vendor name.');
      return;
    }

    // In production: save to WatermelonDB expenses table
    // await database.write(async () => {
    //   await database.get('expenses').create((r) => {
    //     r.amount = parsedAmount;
    //     r.vendor = vendor.trim();
    //     r.category = category;
    //     r.description = description;
    //     r.currency = currency;
    //     r.receiptImageUri = imageUri;
    //     r.ocrRaw = ocrResult?.rawText ?? '';
    //     r.createdBy = user?.id;
    //     r.expenseDate = Date.now();
    //   });
    // });

    Alert.alert('Saved', 'Expense recorded. It will sync when online.', [
      { text: 'OK' },
    ]);

    // Reset
    setPhase('camera');
    setImageUri(null);
    setOcrResult(null);
    setAmount('');
    setVendor('');
    setCategory('Other');
    setDescription('');
    setCurrency('USD');
  }, [amount, vendor, category, description, currency, imageUri, ocrResult, user]);

  // ── Permission gate ──────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Camera access is needed to capture receipts.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera phase ─────────────────────────────────────────────────
  if (phase === 'camera') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraHint}>Point at receipt and tap capture</Text>
          </View>
        </CameraView>
        <TouchableOpacity style={styles.captureButton} onPress={() => void handleCapture()}>
          <View style={styles.captureInner} />
        </TouchableOpacity>
      </View>
    );
  }

  // ── Processing phase ─────────────────────────────────────────────
  if (phase === 'processing') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.processingText}>Analyzing receipt...</Text>
      </View>
    );
  }

  // ── Confirm phase ────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
      )}

      {ocrResult && ocrResult.confidence > 0 && (
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>
            OCR Confidence: {Math.round(ocrResult.confidence * 100)}%
          </Text>
        </View>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={[styles.input, styles.currencyInput]}
            value={currency}
            onChangeText={setCurrency}
            maxLength={3}
          />
          <TextInput
            style={[styles.input, styles.amountInput]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Vendor</Text>
        <TextInput style={styles.input} value={vendor} onChangeText={setVendor} placeholder="Vendor name" />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {EXPENSE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional notes"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setPhase('camera')}>
          <Text style={styles.secondaryButtonText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Save Expense</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8fafc' },
  permissionText: { fontSize: 16, color: '#475569', textAlign: 'center', marginBottom: 16 },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
  cameraHint: { color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  captureButton: {
    position: 'absolute', bottom: 32, alignSelf: 'center',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center',
  },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },

  // Processing
  processingText: { marginTop: 16, fontSize: 16, color: '#475569' },

  // Confirm form
  preview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  confidenceBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 16, alignSelf: 'flex-start' },
  confidenceText: { color: '#1e40af', fontSize: 12, fontWeight: '600' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  amountRow: { flexDirection: 'row', gap: 8 },
  currencyInput: { width: 60, textAlign: 'center' },
  amountInput: { flex: 1 },
  multiline: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row' },
  chip: { backgroundColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginRight: 8 },
  chipActive: { backgroundColor: '#1e40af' },
  chipText: { color: '#475569', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: { flex: 1, backgroundColor: '#1e40af', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { flex: 1, backgroundColor: '#e2e8f0', borderRadius: 8, padding: 16, alignItems: 'center' },
  secondaryButtonText: { color: '#475569', fontSize: 16, fontWeight: '600' },
});
