import puppeteer from 'puppeteer';

export async function generateScenarioPDF(scenarioJson) {
  let browser = null;

  try {
    console.log('Launching browser for PDF generation...');
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    page.on('pageerror', (err) => console.error('Preview page error:', err.message));
    await page.setViewport({ width: 1400, height: 1800, deviceScaleFactor: 1 });

    const previewUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:3000/preview.html';
    await page.goto(previewUrl, {
      waitUntil: 'networkidle0',
      timeout: 45000,
    });

    await page.waitForFunction(
      () =>
        typeof window.populateTemplate === 'function' &&
        typeof window.exportScenarioPdfBytes === 'function' &&
        window.html2canvas &&
        window.jspdf &&
        window.PDFLib,
      { timeout: 20000 },
    );

    console.log('Populating template with scenario data...');
    await page.evaluate((json) => {
      window.populateTemplate(json);
    }, scenarioJson);

    await page.waitForFunction(() => window.ecgPagesReady !== false, {
      timeout: 20000,
    }).catch(() => {
      console.log('ECG rendering timeout (may not be needed)');
    });

    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1500)));

    console.log('Exporting PDF with web preview html2canvas path...');
    const base64 = await page.evaluate(async () => {
      const bytes = await window.exportScenarioPdfBytes();
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      return btoa(binary);
    });

    await browser.close();
    browser = null;

    const pdfBuffer = Buffer.from(base64, 'base64');
    console.log(`PDF generation complete (${pdfBuffer.length} bytes)`);
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
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
