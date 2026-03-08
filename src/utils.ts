import { Browser, Page } from 'puppeteer';
import { MovieDetails } from './types';

/**
 * Configura la página para bloquear recursos no esenciales (imágenes, media, fuentes, estilos)
 * y mejorar el rendimiento.
 */
export async function optimizePageLoad(page: Page): Promise<void> {
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (
      ['image', 'media', 'font', 'stylesheet'].includes(request.resourceType())
    ) {
      request.abort();
    } else {
      request.continue();
    }
  });
}

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

/**
 * Divide un array en trozos (chunks) de tamaño especificado.
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
