import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
import { MovieDetails } from './types';
import { getUserInput, buildLetterboxdUrl } from './input';
import { scrapeLetterboxdPage, scrapeMovieDetails } from './letterboxd';
import { saveToCSV } from './output';
import { config } from './config';
import { logger } from './logger';
import { chunk } from './utils';

/**
 * Función principal.
 */
async function main() {
  logger.header('🎬 Bienvenido al Scraper de Letterboxd');

  const { option, yearOrDecade, pages } = getUserInput();
  const browser = await puppeteer.launch(config.puppeteer);

  const movies: MovieDetails[] = [];

  try {
    for (let page = 1; page <= pages; page++) {
      const url = buildLetterboxdUrl(option, yearOrDecade, page);
      logger.header(`\n📄 Explorando página ${page} de ${pages}: ${url}`);

      const movieLinks = await scrapeLetterboxdPage(url, browser);
      const BATCH_SIZE = 5;
      const batches = chunk(movieLinks, BATCH_SIZE);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.header(
          `📦 Procesando lote ${i + 1} de ${batches.length} (${batch.length} películas)...`
        );

        const detailsBatch = await Promise.all(
          batch.map((movieLink) => scrapeMovieDetails(movieLink.link, browser))
        );

        movies.push(...detailsBatch);
      }
    }
  } finally {
    await browser.close();
  }

  const filename = `letterboxd_${option}${yearOrDecade ? `_${yearOrDecade}` : ''}.csv`;
  await saveToCSV(movies, filename);

  logger.header('✅ Scraping finalizado.');
}

// Ejecutar
main();
