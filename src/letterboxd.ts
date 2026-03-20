import { Browser, Page } from 'puppeteer';
import { MovieDetails, MovieLink } from './types';
import {
  cleanupPage,
  createPartialMovieData,
  optimizePageLoad,
  optimizePageLoadDetails,
} from './utils';
import { getMetascore } from './imdb';
import { logger, TaskLogger } from './logger';
import {
  handleCookieConsent,
  waitForMovies,
  extractMoviesFromPage,
  extractDetailsFromPage,
} from './scraping_utils';

/**
 * Navega y extrae la lista de películas básica de una página del listado de Letterboxd.
 * Se encarga de gestionar el consentimiento de cookies y esperar a que renderice la lista.
 * @param url La URL de la página de resultados a scrapear.
 * @param browser La instancia activa de Puppeteer.
 * @returns Un arreglo de enlaces e información básica de las películas en esta página.
 */
export async function scrapeLetterboxdPage(
  url: string,
  browser: Browser
): Promise<MovieLink[]> {
  const page = await browser.newPage();
  await optimizePageLoad(page);

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await handleCookieConsent(page);
  await waitForMovies(page);

  const movies = await extractMoviesFromPage(page);

  await page.close();
  return movies;
}

/**
 * Extrae los detalles específicos de la película actualizando la navegación.
 * Coordina la extracción combinada de Letterboxd y ocasionalmente de IMDb.
 * @param page La página de la que se extraerán los detalles.
 * @returns Los datos de película compilados.
 */
export async function extractMovieDetails(page: Page): Promise<MovieDetails> {
  return await extractDetailsFromPage(page);
}

/**
 * Crea una página optimizada para detalles, navega a la URL y extrae su información.
 * @param url La URL de la película en Letterboxd.
 * @param browser La instancia del navegador.
 * @returns Un objeto envolviendo la página y sus detalles devueltos.
 */
export async function fetchMovieDetailsFromPage(
  url: string,
  browser: Browser
): Promise<{ page: Page; details: MovieDetails }> {
  const page = await browser.newPage();
  await optimizePageLoadDetails(page);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const details = await extractMovieDetails(page);
  return { page, details };
}

/**
 * Intenta cargar los detalles de la película y complementa el Metascore de IMDb
 * de existir un enlace preexistente extraído desde Letterboxd.
 * @param url URL de la película de origen (Letterboxd).
 * @param browser Navegador Puppeteer a utilizar.
 * @param taskLogger Logger para los registros de esta operación concreta.
 * @returns Detalles combinados de la película o nulo si no se puede resolver.
 */
async function tryLoadMovieDetails(
  url: string,
  browser: Browser,
  taskLogger: TaskLogger
): Promise<MovieDetails | null> {
  try {
    const { page, details } = await fetchMovieDetailsFromPage(url, browser);
    if (details.imdbLink) {
      details.metascore = await getMetascore(
        details.imdbLink,
        browser,
        taskLogger
      );
    }
    await page.close();
    return details;
  } catch (_error) {
    return null;
  }
}

/**
 * Controla el ciclo completo de scraping para los detalles de una película,
 * gestionando reintentos ante caídas y reportando su estado al sistema de logs.
 * @param url Enlace directo de Letterboxd de la película en concreto.
 * @param browser Instancia principal de Puppeteer.
 * @returns Un paquete con los detalles recuperados junto al logger usado.
 */
export async function scrapeMovieDetails(
  url: string,
  browser: Browser
): Promise<{ details: MovieDetails; taskLogger: TaskLogger }> {
  const slug = url.split('/film/')[1]?.replace('/', '') || 'desconocido';
  const taskLogger = logger.createTaskLogger(slug);

  const MAX_RETRIES = 3;
  for (let retries = 0; retries <= MAX_RETRIES; retries++) {
    const details = await tryLoadMovieDetails(url, browser, taskLogger);
    if (details) return { details, taskLogger };

    await cleanupPage(browser);
    if (retries < MAX_RETRIES) {
      taskLogger.warn(`⚠️ Retry ${retries}/${MAX_RETRIES} for ${slug}...`);
      await new Promise((r) => setTimeout(r, retries * 5000));
    }
  }

  taskLogger.error(`❌ Failed: ${slug}`);
  return { details: createPartialMovieData(slug), taskLogger };
}
