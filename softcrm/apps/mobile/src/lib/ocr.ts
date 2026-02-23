/**
 * OCR module — extracts amount + vendor from receipt images.
 *
 * Uses pattern-matching on recognized text to find:
 * - Total amount (currency + digits)
 * - Vendor/merchant name
 * - Date (if available)
 *
 * In production, this would use Google ML Kit or TensorFlow Lite
 * for on-device text recognition. This scaffold provides the
 * extraction logic that processes recognized text output.
 */

export interface OcrResult {
  rawText: string;
  amount: number | null;
  currency: string;
  vendor: string | null;
  date: string | null;
  confidence: number;
}

/**
 * Extract receipt data from raw OCR text.
 * This is the post-processing step after ML Kit/TF Lite recognition.
 */
export function extractReceiptData(rawText: string): OcrResult {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  
  const amount = extractAmount(lines);
  const currency = extractCurrency(rawText);
  const vendor = extractVendor(lines);
  const date = extractDate(rawText);
  
  // Confidence based on how many fields we found
  let fieldsFound = 0;
  if (amount !== null) fieldsFound++;
  if (vendor !== null) fieldsFound++;
  if (date !== null) fieldsFound++;
  const confidence = fieldsFound / 3;

  return {
    rawText,
    amount,
    currency,
    vendor,
    date,
    confidence,
  };
}

/**
 * Extract the total amount from receipt lines.
 * Looks for patterns like "Total: $12.34", "TOTAL 12.34", "Amount Due: 12.34"
 */
export function extractAmount(lines: string[]): number | null {
  const totalPatterns = [
    /(?:total|amount\s*due|grand\s*total|sum|balance\s*due)\s*[:.]?\s*[$€£¥]?\s*([\d,]+\.?\d*)/i,
    /[$€£¥]\s*([\d,]+\.\d{2})\s*$/i,
  ];

  // Search in reverse (totals usually at bottom)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line) continue;
    
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        const stripped = match[1].replace(/,/g, '');
        const parsed = parseFloat(stripped);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
  }

  return null;
}

/**
 * Detect currency from text.
 */
export function extractCurrency(text: string): string {
  if (text.includes('€') || /eur/i.test(text)) return 'EUR';
  if (text.includes('£') || /gbp/i.test(text)) return 'GBP';
  if (text.includes('¥') || /jpy|cny/i.test(text)) return 'JPY';
  return 'USD'; // default
}

/**
 * Extract vendor name — usually the first non-empty line or a prominent line.
 */
export function extractVendor(lines: string[]): string | null {
  if (lines.length === 0) return null;

  // Skip lines that look like dates, addresses, or phone numbers
  for (const line of lines) {
    if (!line) continue;
    // Skip if it's mostly numbers or looks like an address/date
    if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(line)) continue;
    if (/^\d+\s/.test(line) && /\b(st|ave|rd|blvd|dr|ln)\b/i.test(line)) continue;
    if (/^[\d()+\- ]+$/.test(line)) continue; // phone numbers
    if (line.length < 2) continue;
    
    // First substantial text line is likely the vendor name
    return line;
  }

  return lines[0] ?? null;
}

/**
 * Extract date from receipt text.
 */
export function extractDate(text: string): string | null {
  const datePatterns = [
    /(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/,
    /(\d{4}[/.-]\d{1,2}[/.-]\d{1,2})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{2,4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Process image for OCR — placeholder for ML Kit integration.
 * In production, this calls Google ML Kit's text recognition API.
 *
 * @param imageUri - The local URI of the captured photo
 * @returns The raw recognized text
 */
export async function recognizeText(_imageUri: string): Promise<string> {
  // In production:
  // import TextRecognition from '@react-native-ml-kit/text-recognition';
  // const result = await TextRecognition.recognize(imageUri);
  // return result.text;

  // Scaffold returns empty — will be wired to ML Kit in production
  return '';
}
