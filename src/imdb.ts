import { Browser, Page } from 'puppeteer';
import { cleanupPage, optimizePageLoad } from './utils';
import { TaskLogger } from './logger';

let isHandlingCookies = false;
let imdbCookiesHandled = false;

/**
 * Abre una pestaña temporal de IMDb para aceptar las cookies una sola vez
 * de forma sincronizada, antes de abrir las pestañas de las películas.
 * Esto evita que IMDb refresque pestañas concurrentes al aceptar cookies.
 */
async function ensureImdbCookies(browser: Browser): Promise<void> {
  if (imdbCookiesHandled) return;

  while (isHandlingCookies) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (imdbCookiesHandled) return;

  isHandlingCookies = true;
  try {
    const page = await browser.newPage();
    await optimizePageLoad(page);
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
    );
    await page.goto('https://www.imdb.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const consentButton = await page.$('[data-testid="accept-button"]');
    if (consentButton) {
      await consentButton.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    await page.close();
    imdbCookiesHandled = true;
  } catch (_e) {
    // Si falla, intentará silenciosamente o ignorará
  } finally {
    isHandlingCookies = false;
  }
}

const imdbConcurrencyLimit = 2;
let activeImdbRequests = 0;
const imdbQueue: (() => void)[] = [];

async function acquireImdbPermit(): Promise<void> {
  if (activeImdbRequests < imdbConcurrencyLimit) {
    activeImdbRequests++;
    return;
  }
  return new Promise((resolve) => {
    imdbQueue.push(resolve);
  });
}

function releaseImdbPermit(): void {
  activeImdbRequests--;
  if (imdbQueue.length > 0) {
    activeImdbRequests++;
    const next = imdbQueue.shift();
    if (next) next();
  }
}

/**
 * Abre una nueva página de IMDb con un user agent personalizado
 * Protegido por una cola de concurrencia para evitar que AWS WAF bloquee por demasiadas peticiones.
 */
export async function createImdbPage(
  browser: Browser,
  imdbUrl: string
): Promise<{ page: Page; release: () => void }> {
  await ensureImdbCookies(browser);
  await acquireImdbPermit();

  let page: Page | null = null;
  try {
    page = await browser.newPage();
    await optimizePageLoad(page);
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
    );

    await page.goto(imdbUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    return { page, release: releaseImdbPermit };
  } catch (error) {
    if (page) await page.close();
    releaseImdbPermit();
    throw error;
  }
}

/**
 * Función que se ejecuta en el navegador para extraer el texto del Metascore.
 */
function evaluateMetascore(): string {
  const findBySelectors = () => {
    const selectors = [
      'a[href*="criticreviews"] .metacritic-score-box',
      'a[href*="criticreviews"] .score',
      'span.three-Elements .score',
      '.metacritic-score-box',
      '[data-testid="score-box-metacritic"]',
      '.score-box--metacritic',
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
        const container =
          el.closest('.three-Elements') ||
          el.closest('a') ||
          el.parentElement?.parentElement;

        if (container) {
          const scoreEl = container.querySelector(
            '.score, .metacritic-score-box'
          );
          const score = scoreEl?.textContent?.trim();
          if (score && !isNaN(parseInt(score, 10))) return score;
        }
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
    // Esperar a que algún selector relevante aparezca y tenga texto
    await page
      .waitForFunction(
        () => {
          const el = document.querySelector(
            'a[href*="criticreviews"] .metacritic-score-box, a[href*="criticreviews"] .score, [data-testid="score-box-metacritic"]'
          );
          return el && el.textContent && el.textContent.trim().length > 0;
        },
        { timeout: 20000 }
      )
      .catch((err) => {
        taskLogger.warn(
          '⚠️ Se agotó el tiempo de espera para el Metascore: ' + err.message
        );
      });

    const metascoreText = await page.evaluate(evaluateMetascore);
    return parseMetascoreText(metascoreText, taskLogger);
  } catch (error) {
    taskLogger.error('⚠️ No se encontró el Metascore. Error: ' + error);
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
      const { page: imdbPage, release } = await createImdbPage(
        browser,
        imdbUrl
      );
      page = imdbPage;
      if (!page) throw new Error('Page creation failed');
      const metascore = await extractMetascore(page, taskLogger);
      await page.close();
      release();
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
