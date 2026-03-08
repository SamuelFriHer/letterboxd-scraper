import { Browser, Page } from 'puppeteer';
import { MovieDetails, MovieLink } from './types';
import { cleanupPage, createPartialMovieData, optimizePageLoad } from './utils';
import { getMetascore } from './imdb';
import { logger } from './logger';
import {
  handleCookieConsent,
  waitForMovies,
  extractMoviesFromPage,
  extractDetailsFromPage,
} from './scraping_utils';

/**
 * Scrapea una página de Letterboxd para obtener películas.
 */
export async function scrapeLetterboxdPage(
  url: string,
  browser: Browser
): Promise<MovieLink[]> {
  const page = await browser.newPage();
  await optimizePageLoad(page);
  await page.goto(url, { waitUntil: 'networkidle2' });

  await handleCookieConsent(page);
  await waitForMovies(page);

  const movies = await extractMoviesFromPage(page);

  await page.close();
  return movies;
}

/**
 * Extrae los detalles de la película de una página de Letterboxd.
 */
export async function extractMovieDetails(page: Page): Promise<MovieDetails> {
  return await extractDetailsFromPage(page);
}

/**
 * Navega a la URL de la película y extrae sus detalles.
 */
export async function fetchMovieDetailsFromPage(
  url: string,
  browser: Browser
): Promise<{ page: Page; details: MovieDetails }> {
  const page = await browser.newPage();
  await optimizePageLoad(page);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const details = await extractMovieDetails(page);
  return { page, details };
}

/**
 * Intenta cargar los detalles de una película.
 */
async function tryLoadMovieDetails(
  url: string,
  browser: Browser
): Promise<MovieDetails | null> {
  try {
    const { page, details } = await fetchMovieDetailsFromPage(url, browser);
    if (details.imdbLink) {
      details.metascore = await getMetascore(details.imdbLink, browser);
    }
    await page.close();
    return details;
  } catch (_error) {
    return null;
  }
}

/**
 * Scrapea los detalles de una película en Letterboxd.
 */
export async function scrapeMovieDetails(
  url: string,
  browser: Browser
): Promise<MovieDetails> {
  const slug = url.split('/film/')[1]?.replace('/', '') || 'desconocido';
  logger.log(`\n🎬 Scrapeando: ${slug}`);

  const MAX_RETRIES = 3;
  for (let retries = 0; retries <= MAX_RETRIES; retries++) {
    const details = await tryLoadMovieDetails(url, browser);
    if (details) return details;

    await cleanupPage(browser);
    if (retries < MAX_RETRIES) {
      logger.warn(`⚠️ Retry ${retries}/${MAX_RETRIES} for ${slug}...`);
      await new Promise((r) => setTimeout(r, retries * 5000));
    }
  }

  logger.error(`❌ Failed: ${slug}`);
  return createPartialMovieData(slug);
}
