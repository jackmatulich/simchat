import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, PDFName } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateScenarioPDF(scenarioJson) {
  let browser = null;
  
  try {
    console.log('Launching browser for PDF generation...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    
    const page = await browser.newPage();
    page.on('pageerror', (err) => console.error('Preview page error:', err.message));

    const previewUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:3000/preview.html';
    await page.goto(previewUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.waitForFunction(() => typeof window.populateTemplate === 'function', {
      timeout: 10000,
    });

    console.log('Populating template with scenario data...');
    await page.evaluate((json) => {
      window.populateTemplate(json);
    }, scenarioJson);
    
    await page.waitForFunction(
      () => window.ecgPagesReady !== false,
      { timeout: 15000 }
    ).catch(() => {
      console.log('ECG rendering timeout (may not be needed)');
    });
    
    await page.evaluate(() => {
      return new Promise((resolve) => setTimeout(resolve, 2000));
    });
    
    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    
    await browser.close();
    browser = null;
    
    console.log('Embedding scenario JSON in PDF...');
    const enrichedPdf = await embedScenarioJsonInPdf(pdfBuffer, scenarioJson);
    
    console.log('PDF generation complete');
    return enrichedPdf;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

async function embedScenarioJsonInPdf(pdfBytes, scenarioData) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const projectStateBytes = new TextEncoder().encode(JSON.stringify(scenarioData));
    const projectStateStream = pdfDoc.context.flateStream(projectStateBytes);
    const projectStateRef = pdfDoc.context.register(projectStateStream);
    
    const realiti360Ref = pdfDoc.context.register(
      pdfDoc.context.obj({
        SchemaVersion: 1,
        ProjectState: projectStateRef,
      })
    );
    
    pdfDoc.catalog.set(PDFName.of('Realiti360'), realiti360Ref);
    
    return Buffer.from(await pdfDoc.save());
  } catch (error) {
    console.error('Error embedding JSON in PDF:', error);
    return pdfBytes;
  }
}

export function extractScenarioName(scenarioJson) {
  return scenarioJson.scenarioName || 'Clinical Scenario';
}

export function generateScenarioTitle(scenarioJson) {
  const name = extractScenarioName(scenarioJson);
  const type = scenarioJson.scenarioType || 'Vital Signs';
  return `${name} (${type})`;
}
