import { Browser, Page } from 'puppeteer';
import { cleanupPage } from './utils';

/**
 * Abre una nueva página de IMDb con un user agent personalizado
 */
export async function createImdbPage(browser: Browser, imdbUrl: string): Promise<Page> {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
  );

  await page.goto(imdbUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 45000, // 45 segundos de timeout
  });

  return page;
}

/**
 * Extrae el Metascore de una página de IMDb
 */
export async function extractMetascore(page: Page): Promise<number> {
  try {
    const metascoreText = await page.$eval('.metacritic-score-box', (el) => el.textContent?.trim() || 'N/A');

    const metascore = parseInt(metascoreText, 10);
    console.log(`✅ Metascore: ${metascore}`);
    return isNaN(metascore) ? -1 : metascore;
  } catch (error) {
    console.log('⚠️ No se encontró el Metascore.');
    return -1;
  }
}

/**
 * Maneja la espera entre reintentos con backoff exponencial
 */
export async function handleRetry(retries: number, maxRetries: number): Promise<void> {
  const waitTime = retries * 3000; // 3s, 6s, etc.
  console.log(`⚠️ Error al cargar IMDb. Reintento ${retries}/${maxRetries} en ${waitTime / 1000} segundos...`);
  await new Promise((resolve) => setTimeout(resolve, waitTime));
}

/**
 * Obtiene el Metascore de IMDb.
 */
export async function getMetascore(imdbUrl: string, browser: Browser): Promise<number> {
  console.log(`🔍 Buscando Metascore en IMDb...`);

  const MAX_RETRIES = 2;
  let retries = 0;

  while (retries <= MAX_RETRIES) {
    let page: Page | null = null;

    try {
      page = await createImdbPage(browser, imdbUrl);
      const metascore = await extractMetascore(page);
      await page.close();
      return metascore;
    } catch (error) {
      retries++;

      if (page) {
        await page.close();
      } else {
        await cleanupPage(browser);
      }

      if (retries <= MAX_RETRIES) {
        await handleRetry(retries, MAX_RETRIES);
      } else {
        console.log(`❌ No se pudo cargar IMDb después de ${MAX_RETRIES} intentos.`);
        return -1;
      }
    }
  }

  return -1;
}
