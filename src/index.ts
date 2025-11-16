import puppeteer from 'puppeteer';
import { MovieDetails } from './types';
import { getUserInput, buildLetterboxdUrl } from './input';
import { scrapeLetterboxdPage, scrapeMovieDetails } from './letterboxd';
import { saveToCSV } from './output';

/**
 * Función principal.
 */
async function main() {
  console.log('🎬 Bienvenido al Scraper de Letterboxd');

  const { option, yearOrDecade, pages } = getUserInput();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const movies: MovieDetails[] = [];

  for (let page = 1; page <= pages; page++) {
    const url = buildLetterboxdUrl(option, yearOrDecade, page);
    console.log(`\n📄 Explorando página ${page} de ${pages}: ${url}`);

    const movieLinks = await scrapeLetterboxdPage(url);
    for (let i = 0; i < movieLinks.length; i++) {
      console.log(`\n📽️ Película ${i + 1} de ${movieLinks.length}`);
      const details = await scrapeMovieDetails(movieLinks[i].link, browser);
      movies.push(details);
    }
  }

  await browser.close();

  const filename = `letterboxd_${option}${yearOrDecade ? `_${yearOrDecade}` : ''}.csv`;
  await saveToCSV(movies, filename);

  console.log('✅ Scraping finalizado.');
}

// Ejecutar
main();
