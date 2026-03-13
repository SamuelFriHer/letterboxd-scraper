import { Page } from 'puppeteer';
import { MovieLink } from './types';
import { logger } from './logger';

/**
 * Intenta aceptar las cookies si aparece el diálogo.
 */
export async function handleCookieConsent(page: Page): Promise<void> {
  try {
    const consentButtonSelector = '.fc-cta-consent';
    const consentButton = await page.$(consentButtonSelector);

    if (consentButton) {
      logger.log('🍪 Diálogo de consentimiento detectado. Aceptando...');
      await consentButton.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (_e) {
    // Silencioso si no hay cookies
  }
}

/**
 * Espera a que carguen los selectores de películas.
 */
export async function waitForMovies(page: Page): Promise<void> {
  try {
    await page.waitForSelector('.posteritem', { timeout: 30000 });
  } catch (error) {
    logger.error('❌ Error: Timeout buscando películas.');
    throw error;
  }
}

/**
 * Extrae la lista de películas de la página.
 */
export async function extractMoviesFromPage(page: Page): Promise<MovieLink[]> {
  return page.evaluate(() => {
    const movieElements = document.querySelectorAll('.posteritem');
    const movieList: { title: string; link: string }[] = [];

    movieElements.forEach((movie) => {
      const reactComponent = movie.querySelector('.react-component');
      if (reactComponent) {
        const title = reactComponent.getAttribute('data-item-name') || '';
        const link = reactComponent.getAttribute('data-item-link') || '';

        if (title && link) {
          movieList.push({ title, link: `https://letterboxd.com${link}` });
        }
      }
    });

    return movieList;
  });
}

/**
 * Extrae el enlace de IMDb de la página de Letterboxd.
 */
async function extractImdbLink(page: Page): Promise<string> {
  let imdbLink = await page.evaluate(() => {
    const imdbElement = document.querySelector("a[href*='imdb.com/title']");
    return imdbElement?.getAttribute('href') || '';
  });

  if (!imdbLink) {
    imdbLink = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      const imdbLinkEl = allLinks.find((a) =>
        a.href.includes('imdb.com/title/')
      );
      return imdbLinkEl?.href || '';
    });
  }

  if (imdbLink && imdbLink.startsWith('/')) {
    imdbLink = `https://www.imdb.com${imdbLink}`;
  }
  return imdbLink.replace('/maindetails', '/');
}

/**
 * Extrae los datos básicos de la película (título, año, directores).
 */
async function extractBasicMovieDetails(page: Page) {
  return page.evaluate(() => {
    const titleElement = document.querySelector(
      'h1.headline-1.primaryname span.name'
    );
    const yearElement = document.querySelector('span.releasedate a');
    const directorsElements = document.querySelectorAll(
      '.credits a.contributor[href^="/director/"]'
    );

    const title = titleElement?.textContent?.trim() || 'Desconocido';
    const year = yearElement?.textContent?.trim() || 'Desconocido';

    const directors = Array.from(directorsElements)
      .map((dir) => dir.textContent?.trim())
      .filter(Boolean)
      .join(', ');

    return { title, year, directors, metascore: -1 };
  });
}

/**
 * Extrae detalles de una película.
 */
export async function extractDetailsFromPage(page: Page) {
  const imdbLink = await extractImdbLink(page);
  const details = await extractBasicMovieDetails(page);

  return { ...details, imdbLink };
}
