import { Page } from 'puppeteer';
import { MovieLink } from './types';
import { logger } from './logger';

/**
 * Verifica de manera no bloqueante si hay un diálogo de consentimiento de cookies activo
 * para aceptarlo y limpiar la visualización del contenido.
 * @param page Página activa de Puppeteer actual.
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
 * Detiene la ejecución esperando hasta que el elemento de la cuadrícula
 * inicial de películas apunte a estar completamente cargado en el documento.
 * @param page Página de Puppeteer a monitorear.
 */
export async function waitForMovies(page: Page): Promise<void> {
  try {
    await page.waitForSelector('.posteritem, .tooltip.griditem', {
      timeout: 30000,
    });
  } catch (error) {
    logger.error('❌ Error: Timeout buscando películas.');
    throw error;
  }
}

/**
 * Recupera título y enlace base de la lista inicial de cartelera renderizada en la página de resultados.
 * Construye la URL completa a partir de los atributos de cada componente visible.
 * @param page Instancia de la página de Letterboxd que se investiga.
 * @returns Array de objetos MovieLink.
 */
export async function extractMoviesFromPage(page: Page): Promise<MovieLink[]> {
  return page.evaluate(() => {
    const movieElements = document.querySelectorAll(
      '.posteritem, .tooltip.griditem'
    );
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
 * Identifica iterativamente links hacia IMDb mediante selectores DOM variados.
 * Primero prioriza selectores directos para decantar finalmente en colecciones de links genéricos.
 * @param page Página de detalle de la película de donde extraerlo.
 * @returns Cadena con la URL encontrada (puede estar vacía de no coincidir).
 */
async function findImdbUrlOnPage(page: Page): Promise<string> {
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
  return imdbLink;
}

/**
 * Evalúa y reescribe de forma higienizada el enlace obtenido de IMDb.
 * Valida tanto el dominio como el protocolo evitando ataques comunes (SSRF, URI manipulation).
 * @param imdbLink El enlace raw hallado en el HTML.
 * @returns La propia URL procesada si es segura, o una cadena vacía en caso de anomalías.
 */
function validateImdbUrl(imdbLink: string): string {
  if (!imdbLink) return '';
  try {
    const parsedUrl = new URL(imdbLink);
    // Validar protocolo y dominio para prevenir SSRF y LFI
    if (
      !['http:', 'https:'].includes(parsedUrl.protocol) ||
      !(
        parsedUrl.hostname === 'imdb.com' ||
        parsedUrl.hostname.endsWith('.imdb.com')
      )
    ) {
      logger.warn(`⚠️ Enlace de IMDb no seguro ignorado: ${imdbLink}`);
      return '';
    }
  } catch (_e) {
    return '';
  }
  return imdbLink.replace('/maindetails', '/');
}

/**
 * Coordine la búsqueda y validación del enlace específico de IMDb anidado en los datos de la película.
 * @param page Página de detalle de película en Letterboxd cargada.
 * @returns URL oficial de la película en imdb.com.
 */
async function extractImdbLink(page: Page): Promise<string> {
  const imdbLink = await findImdbUrlOnPage(page);
  return validateImdbUrl(imdbLink);
}

/**
 * Obra dentro del DOM para rascar y normalizar de los componentes textuales puros
 * como el título, su año exacto de publicación y la directiva acreditada por la misma.
 * @param page Página en el contexto de extracción bajo evaluación.
 * @returns Detalles primordiales en formato objeto plano con metascore predeterminado.
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
 * Engloba llamadas de alto nivel para compilar a través de micro-tareas todas las
 * especificaciones requeridas de una sola película abierta en sesión.
 * @param page La página apuntando a la tarjeta de metadatos de la película.
 * @returns Objeto fusionado enriquecido con el link correspondiente hacia IMDb.
 */
export async function extractDetailsFromPage(page: Page) {
  const imdbLink = await extractImdbLink(page);
  const details = await extractBasicMovieDetails(page);

  return { ...details, imdbLink };
}
