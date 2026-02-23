import { logger } from '../logger.js';

/**
 * PDF generation using Puppeteer.
 * Accepts an HTML string and returns a PDF buffer.
 *
 * Puppeteer is lazily imported to avoid loading the heavy dependency
 * when PDF generation is not needed (e.g., during tests).
 */
export async function generatePdf(htmlString: string): Promise<Buffer> {
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlString, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });

    await browser.close();
    return Buffer.from(pdfBuffer);
  } catch (err) {
    logger.error({ err }, 'PDF generation failed');
    throw err;
  }
}
