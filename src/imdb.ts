import { Browser, Page } from 'puppeteer';
import { cleanupPage } from './utils';
import { TaskLogger } from './logger';
import { createImdbPage } from './imdb_browser';

/**
 * Función que se ejecuta en el contexto del navegador para extraer el texto del Metascore.
 * Busca iterativamente a través de los selectores posibles en la página.
 * @returns El texto del Metascore encontrado o 'N/A' si no existe.
 */
function evaluateMetascore(): string {
  const selectors = [
    'a[href*="criticreviews"] .metacritic-score-box',
    'a[href*="criticreviews"] .score',
    'span.three-Elements .score',
    '.metacritic-score-box',
    '[data-testid="score-box-metacritic"]',
    '.score-box--metacritic',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const score = el?.textContent?.trim();
    if (score && !isNaN(parseInt(score, 10))) return score;
  }

  for (const el of Array.from(document.querySelectorAll('*'))) {
    if (
      el.children.length === 0 &&
      el.textContent?.trim().toLowerCase() === 'metascore'
    ) {
      const container =
        el.closest('.three-Elements') ||
        el.closest('a') ||
        el.parentElement?.parentElement;
      const score = container
        ?.querySelector('.score, .metacritic-score-box')
        ?.textContent?.trim();
      if (score && !isNaN(parseInt(score, 10))) return score;
    }
  }

  return 'N/A';
}

/**
 * Analiza el texto bruto del Metascore y lo convierte a un valor numérico.
 * @param metascoreText Texto obtenido tras el scraping (ej. "85" o "N/A").
 * @param taskLogger Instancia de TaskLogger para registrar las advertencias.
 * @returns El valor numérico del Metascore o -1 si es inválido/inexistente.
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
 * Extrae el Metascore de una página activa de IMDb.
 * Espera a que el elemento se cargue en el DOM y luego extrae su valor.
 * @param page La página de Puppeteer actual en la que se buscará.
 * @param taskLogger Instancia de TaskLogger para loggear la información.
 * @returns El valor numérico del Metascore, o -1 en caso de error.
 */
export async function extractMetascore(
  page: Page,
  taskLogger: TaskLogger
): Promise<number> {
  try {
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
      .catch(() => {});

    const metascoreText = await page.evaluate(evaluateMetascore);
    return parseMetascoreText(metascoreText, taskLogger);
  } catch (error) {
    taskLogger.error('⚠️ No se encontró el Metascore. Error: ' + error);
    return -1;
  }
}

/**
 * Maneja la pausa y mensajes de advertencia entre reintentos fallidos,
 * utilizando un sistema simple de backoff lineal.
 * @param retries El número de reintento actual.
 * @param maxRetries El número máximo de reintentos permitidos.
 * @param taskLogger Instancia de TaskLogger para registrar el intento.
 */
export async function handleRetry(
  retries: number,
  maxRetries: number,
  taskLogger: TaskLogger
): Promise<void> {
  const waitTime = retries * 3000;
  taskLogger.warn(
    `⚠️ Error al cargar IMDb. Reintento ${retries}/${maxRetries} en ${waitTime / 1000} segundos...`
  );
  await new Promise((resolve) => setTimeout(resolve, waitTime));
}

/**
 * Helper interno para obtener el Metascore y gestionar su página asociada.
 * Se encarga de la creación, limpieza y liberación de recursos de la página de IMDb.
 * @param imdbUrl La URL a la que navegar en busca del Metascore.
 * @param browser La instancia del navegador.
 * @param taskLogger El logger para la tarea actual.
 * @returns El número del Metascore, o lanzará un error si falla la recuperación de la página.
 */
async function tryFetchMetascore(
  imdbUrl: string,
  browser: Browser,
  taskLogger: TaskLogger
): Promise<number> {
  let page: Page | null = null;
  try {
    const { page: imdbPage, release } = await createImdbPage(browser, imdbUrl);
    page = imdbPage;
    if (!page) throw new Error('Page creation failed');
    const metascore = await extractMetascore(page, taskLogger);
    await page.close();
    release();
    return metascore;
  } catch (error) {
    if (page) await page.close();
    else await cleanupPage(browser);
    throw error;
  }
}

/**
 * Función principal para obtener el Metascore gestionando los reintentos
 * en caso de caídas de conexión o rechazos de la página.
 * @param imdbUrl La URL de IMDb de la película.
 * @param browser La instancia de Puppeteer.
 * @param taskLogger Logger dedicado a la tarea en curso.
 * @returns El Metascore numérico (-1 si fracasaron todos los intentos).
 */
export async function getMetascore(
  imdbUrl: string,
  browser: Browser,
  taskLogger: TaskLogger
): Promise<number> {
  taskLogger.log(`🔍 Buscando Metascore en IMDb...`);
  const MAX_RETRIES = 2;

  for (let retries = 0; retries <= MAX_RETRIES; retries++) {
    try {
      return await tryFetchMetascore(imdbUrl, browser, taskLogger);
    } catch (_error) {
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
