import { Browser, Page } from 'puppeteer';
import { MovieDetails, MovieLink } from './types';
import { cleanupPage, createPartialMovieData } from './utils';
import { getMetascore } from './imdb';

/**
 * Scrapea una página de Letterboxd para obtener películas.
 */
export async function scrapeLetterboxdPage(
  url: string,
  browser: Browser
): Promise<MovieLink[]> {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Intentar aceptar cookies si aparece el diálogo
  try {
    const consentButtonSelector = '.fc-cta-consent'; // Selector común de Google Funding Choices
    const consentButton = await page.$(consentButtonSelector);
    if (consentButton) {
      console.log('🍪 Diálogo de consentimiento detectado. Aceptando...');
      await consentButton.click();
      // Esperar un poco a que el diálogo desaparezca y el contenido cargue
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (e) {
    // Ignorar errores al intentar cerrar el diálogo, no es crítico si no existe
    console.log('ℹ️ No se detectó o no se pudo cerrar el diálogo de cookies.');
  }

  try {
    await page.waitForSelector('.posteritem', { timeout: 30000 });
  } catch (error) {
    console.error(
      '❌ Error: Tiempo de espera agotado buscando películas. Puede ser por:'
    );
    console.error('   1. Cloudflare bloqueando la conexión.');
    console.error('   2. Internet lento o página muy pesada.');
    console.error('   3. Estructura de la página cambiada.');
    throw error;
  }

  const movies = await page.evaluate(() => {
    const movieElements = document.querySelectorAll('.posteritem');
    const movieList: { title: string; link: string }[] = [];

    movieElements.forEach((movie) => {
      const reactComponent = movie.querySelector('.react-component');

      if (reactComponent) {
        const title = reactComponent.getAttribute('data-item-name') || '';
        const link = reactComponent.getAttribute('data-item-link') || '';

        if (title && link) {
          movieList.push({
            title,
            link: `https://letterboxd.com${link}`,
          });
        }
      }
    });

    return movieList;
  });

  await page.close();
  return movies;
}

/**
 * Extrae los detalles de la película de una página de Letterboxd
 */
export async function extractMovieDetails(page: Page): Promise<MovieDetails> {
  return await page.evaluate(() => {
    const titleElement = document.querySelector(
      'h1.headline-1.primaryname span.name'
    );
    const yearElement = document.querySelector('span.releasedate a');
    const directorsElements = document.querySelectorAll(
      '.creatorlist a.contributor'
    );
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
export async function scrapeMovieDetails(
  url: string,
  browser: Browser
): Promise<MovieDetails> {
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
    } catch (_error) {
      retries++;
      await cleanupPage(browser);

      if (retries <= MAX_RETRIES) {
        const waitTime = retries * 5000; // Espera incremental: 5s, 10s, 15s
        console.log(
          `⚠️ Error al cargar ${slug}. Reintento ${retries}/${MAX_RETRIES} en ${waitTime / 1000} segundos...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        console.log(
          `❌ No se pudo cargar ${slug} después de ${MAX_RETRIES} intentos.`
        );
        return createPartialMovieData(slug);
      }
    }
  }

  return createPartialMovieData(slug);
}
