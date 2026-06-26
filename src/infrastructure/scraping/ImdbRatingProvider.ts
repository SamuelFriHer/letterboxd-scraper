import { Page } from 'puppeteer';
import { RatingProvider } from '../../domain/ports/RatingProvider';
import { TaskLoggerService } from '../../domain/ports/LoggerService';
import { BrowserCoordinator } from '../browser/BrowserCoordinator';
import { ImdbExtractor } from './ImdbExtractor';
import { AppConfiguration } from '../../config/AppConfiguration';

/**
 * Concrete provider that navigates to IMDb pages to reliably extract Metascores.
 */
export class ImdbRatingProvider implements RatingProvider {
  private isHandlingCookies = false;
  private imdbCookiesHandled = false;
  private imdbCookiesAttempted = false;
  private readonly imdbConcurrencyLimit = 2;
  private activeImdbRequests = 0;
  private imdbQueue: (() => void)[] = [];
  private imdbQueueOffset = 0;
  private cookieWaiters: (() => void)[] = [];
  private extractor = new ImdbExtractor();

  constructor(private browserCoordinator: BrowserCoordinator) {}

  /**
   * Opens the targeted IMDb path and searches the DOM structure for its Metascore metrics.
   * @param imdbUrl The complete URL locating the IMDb asset.
   * @param taskLogger The logger to transmit execution progress steps.
   * @returns The integer Metascore metric, or -1 if unavailable globally.
   */
  public async getMetascore(
    imdbUrl: string,
    taskLogger: TaskLoggerService
  ): Promise<number> {
    taskLogger.log(`🔍 Buscando Metascore en IMDb...`);
    const config = AppConfiguration.getInstance();
    const maxRetries = config.scraping.imdb.maxRetries;

    for (let r = 0; r <= maxRetries; r++) {
      try {
        return await this.tryFetchMetascore(imdbUrl, taskLogger);
      } catch (_error) {
        if (r < maxRetries) {
          await this.handleRetry(r + 1, maxRetries, taskLogger);
        } else {
          taskLogger.error(
            `❌ No se pudo cargar IMDb después de ${maxRetries} intentos.`
          );
        }
      }
    }
    return -1;
  }

  private async tryFetchMetascore(
    imdbUrl: string,
    taskLogger: TaskLoggerService
  ): Promise<number> {
    let page: Page | null = null;
    let releasePermit: (() => void) | null = null;
    try {
      const pageResult = await this.createImdbPage(imdbUrl);
      page = pageResult.page;
      releasePermit = pageResult.release;

      const metascore = await this.extractor.extractMetascore(page, taskLogger);
      await page.close();
      releasePermit();
      return metascore;
    } catch (error) {
      if (page) await page.close();
      else await this.browserCoordinator.cleanupPage();
      if (releasePermit) releasePermit();
      throw error;
    }
  }

  private async handleRetry(
    retries: number,
    maxRetries: number,
    logger: TaskLoggerService
  ): Promise<void> {
    const config = AppConfiguration.getInstance();
    const waitTime = retries * config.scraping.imdb.retryDelay;
    logger.warn(
      `⚠️ Error al cargar IMDb. Reintento ${retries}/${maxRetries}...`
    );
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  private async createImdbPage(
    imdbUrl: string
  ): Promise<{ page: Page; release: () => void }> {
    this.browserCoordinator.validateSafeUrl(imdbUrl, 'imdb.com');
    await this.ensureImdbCookies();
    await this.acquireImdbPermit();

    let page: Page | null = null;

    try {
      page = await this.browserCoordinator.openOptimizedPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0 Safari/537.36'
      );
      await page.goto(imdbUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      return { page, release: () => this.releaseImdbPermit() };
    } catch (error) {
      if (page) await page.close();
      this.releaseImdbPermit();
      throw error;
    }
  }

  private async ensureImdbCookies(): Promise<void> {
    if (this.imdbCookiesHandled || this.imdbCookiesAttempted) return;
    if (this.isHandlingCookies) {
      return new Promise<void>((resolve) => {
        this.cookieWaiters.push(resolve);
      });
    }

    this.isHandlingCookies = true;
    let page: Page | null = null;
    try {
      page = await this.browserCoordinator.getBrowser().newPage();
      await this.fetchAndAcceptCookies(page);
      this.imdbCookiesHandled = true;
    } catch (error) {
      if (error instanceof Error) {
        // Suppress cookie consent failure so the scraping can still proceed, but avoid page leak.
      }
    } finally {
      this.imdbCookiesAttempted = true;
      if (page) {
        await page.close();
      }
      this.isHandlingCookies = false;
      const pendingWaiters = this.cookieWaiters;
      this.cookieWaiters = [];
      for (const resolve of pendingWaiters) {
        resolve();
      }
    }
  }

  private async fetchAndAcceptCookies(page: Page): Promise<void> {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    await page.goto('https://www.imdb.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    const consentBtn = await page.$('[data-testid="accept-button"]');
    if (consentBtn) {
      await consentBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  private async acquireImdbPermit(): Promise<void> {
    if (this.activeImdbRequests < this.imdbConcurrencyLimit) {
      this.activeImdbRequests++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.imdbQueue.push(resolve);
    });
  }

  private releaseImdbPermit(): void {
    this.activeImdbRequests--;
    if (this.imdbQueueOffset < this.imdbQueue.length) {
      this.activeImdbRequests++;
      const next = this.imdbQueue[this.imdbQueueOffset++];
      if (next) {
        next();
      }
      if (this.imdbQueueOffset === this.imdbQueue.length) {
        this.imdbQueue = [];
        this.imdbQueueOffset = 0;
      }
    }
  }
}
