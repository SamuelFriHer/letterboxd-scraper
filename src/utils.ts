import { Browser, Page } from 'puppeteer';
import { MovieDetails } from './types';

/**
 * Configura la página para bloquear recursos no esenciales (imágenes, media, fuentes, estilos)
 * y mejorar el rendimiento temporal al cargar páginas generales.
 * @param page La página de Puppeteer a configurar.
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
 * Configura la página para bloquear más recursos (incluyendo scripts y XHR)
 * en páginas de detalles donde el contenido ya está en el HTML inicial.
 * Esto agiliza considerablemente la extracción final de datos.
 * @param page La página de Puppeteer a optimizar.
 */
export async function optimizePageLoadDetails(page: Page): Promise<void> {
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (
      [
        'image',
        'media',
        'font',
        'stylesheet',
        'script',
        'xhr',
        'fetch',
      ].includes(request.resourceType())
    ) {
      request.abort();
    } else {
      request.continue();
    }
  });
}

/**
 * Cierra la última pestaña o página activa en caso de error
 * para liberar recursos en el navegador.
 * @param browser Instancia actual del navegador web.
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
 * Valida de forma estricta que una URL utilice un esquema seguro (http/https)
 * y que su dominio pertenezca a un dominio permitido para prevenir ataques
 * SSRF (Server-Side Request Forgery) y LFI (Local File Inclusion).
 * @param url La URL a validar.
 * @param allowedDomain El dominio principal permitido (ej. 'letterboxd.com').
 * @throws {Error} Si la URL no es segura o su dominio no está permitido.
 */
export function validateSafeUrl(url: string, allowedDomain: string): void {
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(`Protocolo inseguro: ${parsedUrl.protocol}`);
    }
    if (
      parsedUrl.hostname !== allowedDomain &&
      !parsedUrl.hostname.endsWith(`.${allowedDomain}`)
    ) {
      throw new Error(`Dominio no permitido: ${parsedUrl.hostname}`);
    }
  } catch (_error) {
    throw new Error(`URL insegura o inválida: ${url}`);
  }
}

/**
 * Crea datos parciales de película basados en el slug en caso de fallos,
 * evitando que la ejecución falle por completo.
 * @param slug El identificador de la URL de la película (slug).
 * @returns Un objeto MovieDetails parcial con valores por defecto.
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
 * Divide un array en trozos (chunks) de tamaño especificado
 * para procesarlos por lotes.
 * @param array El array original a dividir.
 * @param size El tamaño máximo de cada sub-array.
 * @returns Un array de arrays (lotes) de elementos.
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
