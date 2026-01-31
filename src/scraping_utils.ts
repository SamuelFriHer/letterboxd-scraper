import { Page } from 'puppeteer';
import { MovieLink } from './types';

/**
 * Intenta aceptar las cookies si aparece el diálogo.
 */
export async function handleCookieConsent(page: Page): Promise<void> {
  try {
    const consentButtonSelector = '.fc-cta-consent';
    const consentButton = await page.$(consentButtonSelector);

    if (consentButton) {
      console.log('🍪 Diálogo de consentimiento detectado. Aceptando...');
      await consentButton.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (_e) {
    console.log('ℹ️ No se detectó o no se pudo cerrar el diálogo de cookies.');
  }
}

/**
 * Espera a que carguen los selectores de películas.
 */
export async function waitForMovies(page: Page): Promise<void> {
  try {
    await page.waitForSelector('.posteritem', { timeout: 30000 });
  } catch (error) {
    console.error('❌ Error: Timeout buscando películas.');
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
 * Extrae detalles de una película.
 */
export async function extractDetailsFromPage(page: Page) {
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
