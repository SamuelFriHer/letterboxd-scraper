import { Browser, Page } from 'puppeteer';
import { cleanupPage, optimizePageLoad } from './utils';
import { TaskLogger } from './logger';

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
  const findBySelectors = () => {
    const selectors = [
      'a[href*="criticreviews"] .metacritic-score-box',
      'a[href*="criticreviews"] span',
      '.metacritic-score-box',
      '[data-testid="score-box-metacritic"]',
      '.score-box--metacritic',
      '.metacritic-score-label + .score',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const score = el?.textContent?.trim();
      if (score && !isNaN(parseInt(score, 10))) return score;
    }
    return null;
  };

  const findByLabel = () => {
    const allElements = Array.from(document.querySelectorAll('*'));
    for (const el of allElements) {
      if (
        el.children.length === 0 &&
        el.textContent?.trim().toLowerCase() === 'metascore'
      ) {
        const scoreEl = el.parentElement?.querySelector('span, div');
        const score = scoreEl?.textContent?.trim();
        if (score && !isNaN(parseInt(score, 10))) return score;
      }
    }
    return null;
  };

  return findBySelectors() || findByLabel() || 'N/A';
}

/**
 * Analiza el texto del Metascore y lo convierte a número o devuelve -1.
 */
function parseMetascoreText(
  metascoreText: string,
  taskLogger: TaskLogger
): number {
  if (metascoreText === 'N/A') {
    taskLogger.warn('⚠️ No se encontró el Metascore.');
    return -1;
  }

  const metascore = parseInt(metascoreText, 10);
  if (isNaN(metascore)) return -1;

  taskLogger.log(`✅ Metascore: ${metascore}`);
  return metascore;
}

/**
 * Extrae el Metascore de una página de IMDb
 */
export async function extractMetascore(
  page: Page,
  taskLogger: TaskLogger
): Promise<number> {
  try {
    // Esperar a que algún selector relevante aparezca
    await page
      .waitForSelector('a[href*="criticreviews"], .metacritic-score-box', {
        timeout: 5000,
      })
      .catch(() => {});

    const metascoreText = await page.evaluate(evaluateMetascore);
    return parseMetascoreText(metascoreText, taskLogger);
  } catch (_error) {
    taskLogger.warn('⚠️ No se encontró el Metascore.');
    return -1;
  }
}

/**
 * Maneja la espera entre reintentos con backoff exponencial
 */
export async function handleRetry(
  retries: number,
  maxRetries: number,
  taskLogger: TaskLogger
): Promise<void> {
  const waitTime = retries * 3000; // 3s, 6s, etc.
  taskLogger.warn(
    `⚠️ Error al cargar IMDb. Reintento ${retries}/${maxRetries} en ${waitTime / 1000} segundos...`
  );
  await new Promise((resolve) => setTimeout(resolve, waitTime));
}

/**
 * Obtiene el Metascore de IMDb.
 */
export async function getMetascore(
  imdbUrl: string,
  browser: Browser,
  taskLogger: TaskLogger
): Promise<number> {
  taskLogger.log(`🔍 Buscando Metascore en IMDb...`);
  const MAX_RETRIES = 2;

  for (let retries = 0; retries <= MAX_RETRIES; retries++) {
    let page: Page | null = null;

    try {
      page = await createImdbPage(browser, imdbUrl);
      const metascore = await extractMetascore(page, taskLogger);
      await page.close();
      return metascore;
    } catch (_error) {
      if (page) {
        await page.close();
      } else {
        await cleanupPage(browser);
      }

      if (retries < MAX_RETRIES) {
        await handleRetry(retries + 1, MAX_RETRIES, taskLogger);
      } else {
        taskLogger.error(
          `❌ No se pudo cargar IMDb después de ${MAX_RETRIES} intentos.`
        );
      }
    }
  }

  return -1;
}
