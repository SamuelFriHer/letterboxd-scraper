import puppeteer, { Browser, Page } from 'puppeteer';
import { MovieDetails, MovieLink } from './types';
import { cleanupPage, createPartialMovieData } from './utils';
import { getMetascore } from './imdb';

/**
 * Scrapea una página de Letterboxd para obtener películas.
 */
export async function scrapeLetterboxdPage(url: string): Promise<MovieLink[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  await page.waitForSelector('.poster-container', { timeout: 10000 });

  const movies = await page.evaluate(() => {
    const movieElements = document.querySelectorAll('.poster-container');
    const movieList: { title: string; link: string }[] = [];

    movieElements.forEach((movie) => {
      const titleElement = movie.querySelector('.frame-title');
      const linkElement = movie.querySelector('a.frame');

      const title = titleElement?.textContent?.trim();
      const link = linkElement?.getAttribute('href');

      if (title && link) {
        movieList.push({
          title,
          link: `https://letterboxd.com${link}`,
        });
      }
    });

    return movieList;
  });

  await browser.close();
  return movies;
}

/**
 * Extrae los detalles de la película de una página de Letterboxd
 */
export async function extractMovieDetails(page: Page): Promise<MovieDetails> {
  return await page.evaluate(() => {
    const titleElement = document.querySelector('h1.headline-1 span.name');
    const yearElement = document.querySelector('div.releaseyear a');
    const directorsElements = document.querySelectorAll('.directorlist a');
    const imdbElement = document.querySelector("a[href*='imdb.com/title']");

    const title = titleElement?.textContent?.trim() || 'Desconocido';
    const year = yearElement?.textContent?.trim() || 'Desconocido';

    const directors = Array.from(directorsElements)
      .map((dir) => dir.textContent?.trim())
      .filter(Boolean)
      .join(', ');

    let imdbLink = imdbElement?.getAttribute('href') || '';
    if (imdbLink.startsWith('/')) {
      imdbLink = `https://www.imdb.com${imdbLink}`;
    }
    imdbLink = imdbLink.replace('/maindetails', '/');

    return { title, year, directors, imdbLink, metascore: -1 };
  });
}

/**
 * Navega a la URL de la película y extrae sus detalles
 */
export async function fetchMovieDetailsFromPage(
  url: string,
  browser: Browser
): Promise<{ page: Page; details: MovieDetails }> {
  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 60000, // 60 segundos
  });

  const details = await extractMovieDetails(page);

  return { page, details };
}

/**
 * Scrapea los detalles de una película en Letterboxd.
 */
export async function scrapeMovieDetails(url: string, browser: Browser): Promise<MovieDetails> {
  const slug = url.split('/film/')[1]?.replace('/', '') || 'desconocido';
  console.log(`\n🎬 Scrapeando: ${slug}`);

  const MAX_RETRIES = 3;
  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
      const { page, details } = await fetchMovieDetailsFromPage(url, browser);

      if (details.imdbLink) {
        details.metascore = await getMetascore(details.imdbLink, browser);
      }

      await page.close();
      return details;
    } catch (error) {
      retries++;
      await cleanupPage(browser);

      if (retries <= MAX_RETRIES) {
        const waitTime = retries * 5000; // Espera incremental: 5s, 10s, 15s
        console.log(
          `⚠️ Error al cargar ${slug}. Reintento ${retries}/${MAX_RETRIES} en ${waitTime / 1000} segundos...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        console.log(`❌ No se pudo cargar ${slug} después de ${MAX_RETRIES} intentos.`);
        return createPartialMovieData(slug);
      }
    }
  }

  return createPartialMovieData(slug);
}
