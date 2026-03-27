import { Browser, Page } from 'puppeteer';
import { optimizePageLoad, validateSafeUrl } from './utils';

class ImdbBrowserManager {
  private static isHandlingCookies = false;
  private static imdbCookiesHandled = false;
  private static readonly imdbConcurrencyLimit = 2;
  private static activeImdbRequests = 0;
  private static imdbQueue: (() => void)[] = [];

  /**
   * Abre una pestaña temporal de IMDb para aceptar las cookies una sola vez
   * de forma sincronizada, antes de abrir múltiples pestañas para las películas.
   * @param browser La instancia del navegador Puppeteer.
   */
  public static async ensureImdbCookies(browser: Browser): Promise<void> {
    if (this.imdbCookiesHandled) return;

    while (this.isHandlingCookies) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (this.imdbCookiesHandled) return;

    this.isHandlingCookies = true;
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
      this.imdbCookiesHandled = true;
    } catch (_e) {
      // Si falla, intentará silenciosamente o ignorará
    } finally {
      this.isHandlingCookies = false;
    }
  }

  /**
   * Adquiere un permiso para realizar peticiones concurrentes a IMDb,
   * bloqueando la ejecución si se alcanzó el límite preestablecido hasta que se libere un hueco.
   * @returns Una Promesa que se resuelve cuando el permiso es concedido.
   */
  public static async acquireImdbPermit(): Promise<void> {
    if (this.activeImdbRequests < this.imdbConcurrencyLimit) {
      this.activeImdbRequests++;
      return;
    }
    return new Promise((resolve) => {
      this.imdbQueue.push(resolve);
    });
  }

  /**
   * Libera un permiso concurrente utilizado por una petición a IMDb
   * y otorga paso al siguiente en la cola de espera de existir alguno.
   */
  public static releaseImdbPermit(): void {
    this.activeImdbRequests--;
    if (this.imdbQueue.length > 0) {
      this.activeImdbRequests++;
      const next = this.imdbQueue.shift();
      if (next) next();
    }
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
  validateSafeUrl(imdbUrl, 'imdb.com');
  await ImdbBrowserManager.ensureImdbCookies(browser);
  await ImdbBrowserManager.acquireImdbPermit();

  let page: Page | null = null;
  try {
    page = await browser.newPage();
    await optimizePageLoad(page);
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
    );

    await page.goto(imdbUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    return { page, release: () => ImdbBrowserManager.releaseImdbPermit() };
  } catch (error) {
    if (page) await page.close();
    ImdbBrowserManager.releaseImdbPermit();
    throw error;
  }
}
