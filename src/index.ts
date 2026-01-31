import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
import { MovieDetails } from './types';
import { getUserInput, buildLetterboxdUrl } from './input';
import { scrapeLetterboxdPage, scrapeMovieDetails } from './letterboxd';
import { saveToCSV } from './output';
import { config } from './config';
import { logger } from './logger';

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
      for (let i = 0; i < movieLinks.length; i++) {
        logger.startItem(`\n📽️ Película ${i + 1} de ${movieLinks.length}`);
        const details = await scrapeMovieDetails(movieLinks[i].link, browser);
        movies.push(details);
        logger.endItem();
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
