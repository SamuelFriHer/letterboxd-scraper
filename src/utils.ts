import { Browser } from 'puppeteer';
import { MovieDetails } from './types';

/**
 * Cierra una página en caso de error
 */
export async function cleanupPage(browser: Browser): Promise<void> {
  try {
    const pages = await browser.pages();
    const lastPage = pages[pages.length - 1];
    await lastPage.close();
  } catch (_e) {
    // Ignorar errores al intentar cerrar la página
  }
}

/**
 * Crea datos parciales de película basados en el slug
 */
export function createPartialMovieData(slug: string): MovieDetails {
  return {
    title: slug.replace(/-/g, ' '),
    year: 'Desconocido',
    directors: 'Desconocido',
    imdbLink: '',
    metascore: -1,
  };
}
