import { Browser, Page } from 'puppeteer';
import { cleanupPage, optimizePageLoad } from './utils';
import { logger } from './logger';

/**
 * Abre una nueva página de IMDb con un user agent personalizado
 */
export async function createImdbPage(
  browser: Browser,
  imdbUrl: string
): Promise<Page> {
  const page = await browser.newPage();
  await optimizePageLoad(page);
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
 * Función que se ejecuta en el navegador para extraer el texto del Metascore.
 */
function evaluateMetascore(): string {
  // 1. Selector más específico basado en el nuevo HTML
  const reviewLink = document.querySelector('a[href*="criticreviews"]');
  if (reviewLink) {
    const scoreEl = reviewLink.querySelector('.metacritic-score-box, .score');
    if (scoreEl && scoreEl.textContent) return scoreEl.textContent.trim();
  }

  // 2. Buscar por label "Metascore"
  const labels = Array.from(
    document.querySelectorAll('.metacritic-score-label, .label')
  );
  for (const label of labels) {
    if (label.textContent?.trim().toLowerCase() === 'metascore') {
      const container = label.closest('a, li, span.three-Elements');
      const scoreEl = container?.querySelector('.metacritic-score-box, .score');
      if (scoreEl && scoreEl.textContent) return scoreEl.textContent.trim();
    }
  }

  // 3. Fallback al selector de clase original
  const box = document.querySelector('.metacritic-score-box');
  if (box && box.textContent) return box.textContent.trim();

  return 'N/A';
}

/**
 * Analiza el texto del Metascore y lo convierte a número o devuelve -1.
 */
function parseMetascoreText(metascoreText: string): number {
  if (metascoreText === 'N/A') {
    logger.warn('⚠️ No se encontró el Metascore.');
    return -1;
  }

  const metascore = parseInt(metascoreText, 10);
  if (isNaN(metascore)) return -1;

  logger.log(`✅ Metascore: ${metascore}`);
  return metascore;
}

/**
 * Extrae el Metascore de una página de IMDb
 */
export async function extractMetascore(page: Page): Promise<number> {
  try {
    // Esperar a que React renderice los elementos (si existen)
    await page
      .waitForSelector(
        'a[href*="criticreviews"], .metacritic-score-box, .score',
        { timeout: 3000 }
      )
      .catch(() => {});

    const metascoreText = await page.evaluate(evaluateMetascore);
    return parseMetascoreText(metascoreText);
  } catch (_error) {
    logger.warn('⚠️ No se encontró el Metascore.');
    return -1;
  }
}

/**
 * Maneja la espera entre reintentos con backoff exponencial
 */
export async function handleRetry(
  retries: number,
  maxRetries: number
): Promise<void> {
  const waitTime = retries * 3000; // 3s, 6s, etc.
  logger.warn(
    `⚠️ Error al cargar IMDb. Reintento ${retries}/${maxRetries} en ${waitTime / 1000} segundos...`
  );
  await new Promise((resolve) => setTimeout(resolve, waitTime));
}

/**
 * Obtiene el Metascore de IMDb.
 */
export async function getMetascore(
  imdbUrl: string,
  browser: Browser
): Promise<number> {
  logger.log(`🔍 Buscando Metascore en IMDb...`);
  const MAX_RETRIES = 2;

  for (let retries = 0; retries <= MAX_RETRIES; retries++) {
    let page: Page | null = null;

    try {
      page = await createImdbPage(browser, imdbUrl);
      const metascore = await extractMetascore(page);
      await page.close();
      return metascore;
    } catch (_error) {
      if (page) {
        await page.close();
      } else {
        await cleanupPage(browser);
      }

      if (retries < MAX_RETRIES) {
        await handleRetry(retries + 1, MAX_RETRIES);
      } else {
        logger.error(
          `❌ No se pudo cargar IMDb después de ${MAX_RETRIES} intentos.`
        );
      }
    }
  }

  return -1;
}
