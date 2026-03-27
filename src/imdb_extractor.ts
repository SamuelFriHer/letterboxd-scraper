import { Page } from 'puppeteer';
import { TaskLogger } from './logger';

/**
 * Función que se ejecuta en el contexto del navegador para extraer el texto del Metascore.
 * Busca iterativamente a través de los selectores posibles en la página.
 * @returns El texto del Metascore encontrado o 'N/A' si no existe.
 */
function evaluateMetascore(): string {
  const selectors = [
    'a[href*="criticreviews"] .metacritic-score-box',
    'a[href*="criticreviews"] .score',
    'span.three-Elements .score',
    '.metacritic-score-box',
    '[data-testid="score-box-metacritic"]',
    '.score-box--metacritic',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const score = el?.textContent?.trim();
    if (score && !isNaN(parseInt(score, 10))) return score;
  }

  for (const el of Array.from(document.querySelectorAll('*'))) {
    if (
      el.children.length === 0 &&
      el.textContent?.trim().toLowerCase() === 'metascore'
    ) {
      const container =
        el.closest('.three-Elements') ||
        el.closest('a') ||
        el.parentElement?.parentElement;
      const score = container
        ?.querySelector('.score, .metacritic-score-box')
        ?.textContent?.trim();
      if (score && !isNaN(parseInt(score, 10))) return score;
    }
  }

  return 'N/A';
}

/**
 * Analiza el texto bruto del Metascore y lo convierte a un valor numérico.
 * @param metascoreText Texto obtenido tras el scraping (ej. "85" o "N/A").
 * @param taskLogger Instancia de TaskLogger para registrar las advertencias.
 * @returns El valor numérico del Metascore o -1 si es inválido/inexistente.
 */
function parseMetascoreText(
  metascoreText: string,
  taskLogger: TaskLogger
): number {
  if (metascoreText === 'N/A') {
    taskLogger.warn('⚠️ No se encontró el Metascore.');
    return -1;
  }

  const metascore = parseInt(metascoreText, 10);
  if (isNaN(metascore)) return -1;

  taskLogger.log(`✅ Metascore: ${metascore}`);
  return metascore;
}

/**
 * Espera la aparición visual de elementos de Metascore o carga de datos base.
 * Soporta renderizado estático y por hidratación de json dinámico en IMDb.
 * @param page Página actual de Puppeteer a inspeccionar.
 */
async function waitForMetascoreElements(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        if (
          document.querySelector(
            '.three-Elements, a[href*="criticreviews"], [data-testid="score-box-metacritic"], .score-box--metacritic, .metacritic-score-box, .titleReviewBarItem'
          )
        ) {
          return true;
        }

        const dataIsland = document.querySelector('script#__NEXT_DATA__');
        if (dataIsland && dataIsland.innerHTML.length > 1000) {
          try {
            JSON.parse(dataIsland.innerHTML);
            return true;
          } catch (_e) {
            return false;
          }
        }

        return false;
      },
      { timeout: 3000 }
    )
    .catch(() => {});
}

/**
 * Verifica de forma síncrona si el Metascore existe en DOM u objetos de datos dinámicos.
 * @param page Página de Puppeteer a evaluar iterativamente en búsqueda de los ratings.
 * @returns Verdadero si encuentra vestigios visuales o en el estado de NextJS.
 */
async function checkMetascoreExists(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    if (
      document.querySelector(
        '.three-Elements, a[href*="criticreviews"], [data-testid="score-box-metacritic"], .score-box--metacritic, .metacritic-score-box, .titleReviewBarItem'
      )
    ) {
      return true;
    }

    const dataIsland = document.querySelector('script#__NEXT_DATA__');
    if (dataIsland && dataIsland.innerHTML.length > 1000) {
      try {
        const data = JSON.parse(dataIsland.innerHTML);
        const metacritic = data?.props?.pageProps?.aboveTheFoldData?.metacritic;
        return metacritic !== null && metacritic !== undefined;
      } catch (_e) {
        return false;
      }
    }

    return false;
  });
}

/**
 * Otorga un tiempo límite para la renderización final de un score previamente hallado.
 * @param page Página de Puppeteer observada hasta culminar su render de contenido.
 */
async function waitForMetascoreRender(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const el = document.querySelector(
          'a[href*="criticreviews"] .metacritic-score-box, a[href*="criticreviews"] .score, [data-testid="score-box-metacritic"], .score-box--metacritic'
        );
        return el && el.textContent && el.textContent.trim().length > 0;
      },
      { timeout: 5000 }
    )
    .catch(() => {});
}

/**
 * Extrae el Metascore de una página activa de IMDb uniendo sus pasos de lectura.
 * Verifica carga inicial, existencia explícita y su respectivo parsing textual final en DOM.
 * @param page La página de Puppeteer actual en la que se operará en vivo.
 * @param taskLogger Instancia de TaskLogger lista para loggear eventos asíncronos.
 * @returns El valor numérico natural del Metascore, o -1 en caso de omisiones o error fatal.
 */
export async function extractMetascore(
  page: Page,
  taskLogger: TaskLogger
): Promise<number> {
  try {
    await waitForMetascoreElements(page);

    const hasMetascoreContainer = await checkMetascoreExists(page);
    if (!hasMetascoreContainer) {
      taskLogger.warn('⚠️ No se encontró el contenedor de Metascore en datos.');
      return -1;
    }

    await waitForMetascoreRender(page);
    const metascoreText = await page.evaluate(evaluateMetascore);

    return parseMetascoreText(metascoreText, taskLogger);
  } catch (error) {
    taskLogger.error('⚠️ No se encontró el Metascore. Error: ' + error);
    return -1;
  }
}
