import { Browser, Page } from 'puppeteer';
import { optimizePageLoad } from './utils';

let isHandlingCookies = false;
let imdbCookiesHandled = false;

/**
 * Abre una pestaña temporal de IMDb para aceptar las cookies una sola vez
 * de forma sincronizada, antes de abrir múltiples pestañas para las películas.
 * @param browser La instancia del navegador Puppeteer.
 */
async function ensureImdbCookies(browser: Browser): Promise<void> {
  if (imdbCookiesHandled) return;

  while (isHandlingCookies) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (imdbCookiesHandled) return;

  isHandlingCookies = true;
  try {
    const page = await browser.newPage();
    await optimizePageLoad(page);
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
    );
    await page.goto('https://www.imdb.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const consentButton = await page.$('[data-testid="accept-button"]');
    if (consentButton) {
      await consentButton.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    await page.close();
    imdbCookiesHandled = true;
  } catch (_e) {
    // Si falla, intentará silenciosamente o ignorará
  } finally {
    isHandlingCookies = false;
  }
}

const imdbConcurrencyLimit = 2;
let activeImdbRequests = 0;
const imdbQueue: (() => void)[] = [];

/**
 * Adquiere un permiso para realizar peticiones concurrentes a IMDb,
 * bloqueando la ejecución si se alcanzó el límite preestablecido hasta que se libere un hueco.
 * @returns Una Promesa que se resuelve cuando el permiso es concedido.
 */
async function acquireImdbPermit(): Promise<void> {
  if (activeImdbRequests < imdbConcurrencyLimit) {
    activeImdbRequests++;
    return;
  }
  return new Promise((resolve) => {
    imdbQueue.push(resolve);
  });
}

/**
 * Libera un permiso concurrente utilizado por una petición a IMDb
 * y otorga paso al siguiente en la cola de espera de existir alguno.
 */
function releaseImdbPermit(): void {
  activeImdbRequests--;
  if (imdbQueue.length > 0) {
    activeImdbRequests++;
    const next = imdbQueue.shift();
    if (next) next();
  }
}

/**
 * Abre una nueva página de IMDb con un user agent personalizado,
 * asegurando la aceptación de cookies y protegiéndolo por una cola de concurrencia.
 * @param browser La instancia del navegador de Puppeteer.
 * @param imdbUrl La URL de IMDb a la que navegar a continuación.
 * @returns Un objeto con la nueva página creada y una función para liberar su cupo de concurrencia.
 */
export async function createImdbPage(
  browser: Browser,
  imdbUrl: string
): Promise<{ page: Page; release: () => void }> {
  await ensureImdbCookies(browser);
  await acquireImdbPermit();

  let page: Page | null = null;
  try {
    page = await browser.newPage();
    await optimizePageLoad(page);
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
    );

    await page.goto(imdbUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    return { page, release: releaseImdbPermit };
  } catch (error) {
    if (page) await page.close();
    releaseImdbPermit();
    throw error;
  }
}
