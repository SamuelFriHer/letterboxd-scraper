import { Browser, Page } from 'puppeteer';
import { cleanupPage } from './utils';
import { TaskLogger } from './logger';
import { createImdbPage } from './imdb_browser';
import { extractMetascore } from './imdb_extractor';

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
