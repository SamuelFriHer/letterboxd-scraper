import { Page, HTTPRequest } from 'puppeteer';
import { RatingProvider } from '../../domain/ports/RatingProvider';
import { TaskLoggerService } from '../../domain/ports/LoggerService';
import { BrowserCoordinator } from '../browser/BrowserCoordinator';

export class ImdbRatingProvider implements RatingProvider {
  private isHandlingCookies = false;
  private imdbCookiesHandled = false;
  private readonly imdbConcurrencyLimit = 2;
  private activeImdbRequests = 0;
  private imdbQueue: (() => void)[] = [];

  constructor(private browserCoordinator: BrowserCoordinator) {}

  public async getMetascore(
    imdbUrl: string,
    taskLogger: TaskLoggerService
  ): Promise<number> {
    taskLogger.log(`🔍 Buscando Metascore en IMDb...`);
    const MAX_RETRIES = 2;

    for (let r = 0; r <= MAX_RETRIES; r++) {
      try {
        return await this.tryFetchMetascore(imdbUrl, taskLogger);
      } catch (_e) {
        if (r < MAX_RETRIES) {
          await this.handleRetry(r + 1, MAX_RETRIES, taskLogger);
        } else {
          taskLogger.error(
            `❌ No se pudo cargar IMDb después de ${MAX_RETRIES} intentos.`
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

      const metascore = await this.extractMetascore(page, taskLogger);
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
    const waitTime = retries * 3000;
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

    const browser = this.browserCoordinator.getBrowser();
    let page: Page | null = null;

    try {
      page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (request: HTTPRequest) => {
        const t = request.resourceType();
        if (['image', 'media', 'font', 'stylesheet'].includes(t)) {
          request.abort();
        } else {
          request.continue();
        }
      });
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
    if (this.imdbCookiesHandled) return;
    while (this.isHandlingCookies) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (this.imdbCookiesHandled) return;

    this.isHandlingCookies = true;
    try {
      const page = await this.browserCoordinator.getBrowser().newPage();
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
      await page.close();
      this.imdbCookiesHandled = true;
    } catch (_e) {
      // Ignorar
    } finally {
      this.isHandlingCookies = false;
    }
  }

  private async acquireImdbPermit(): Promise<void> {
    if (this.activeImdbRequests < this.imdbConcurrencyLimit) {
      this.activeImdbRequests++;
      return;
    }
    return new Promise((r) => this.imdbQueue.push(r));
  }

  private releaseImdbPermit(): void {
    this.activeImdbRequests--;
    if (this.imdbQueue.length > 0) {
      this.activeImdbRequests++;
      const next = this.imdbQueue.shift();
      if (next) next();
    }
  }

  private async extractMetascore(
    page: Page,
    taskLogger: TaskLoggerService
  ): Promise<number> {
    try {
      await this.waitForMetascoreElements(page);
      const hasContainer = await this.checkMetascoreExists(page);
      if (!hasContainer) {
        taskLogger.warn('⚠️ Contenedor de Metascore no hallado.');
        return -1;
      }

      await this.waitForMetascoreRender(page);
      const metascoreText = await page.evaluate(this.evaluateMetascoreDOM);
      return this.parseMetascoreText(metascoreText, taskLogger);
    } catch (error) {
      taskLogger.error('⚠️ Metascore no hallado. Error: ' + error);
      return -1;
    }
  }

  private async waitForMetascoreElements(page: Page): Promise<void> {
    await page
      .waitForFunction(
        () => {
          if (document.querySelector('.three-Elements, .metacritic-score-box'))
            return true;
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

  private async checkMetascoreExists(page: Page): Promise<boolean> {
    return page.evaluate(() => {
      if (document.querySelector('.three-Elements, .metacritic-score-box'))
        return true;
      const dataIsland = document.querySelector('script#__NEXT_DATA__');
      if (dataIsland && dataIsland.innerHTML.length > 1000) {
        try {
          const data = JSON.parse(dataIsland.innerHTML);
          const mc = data?.props?.pageProps?.aboveTheFoldData?.metacritic;
          return mc !== null && mc !== undefined;
        } catch (_e) {
          return false;
        }
      }
      return false;
    });
  }

  private async waitForMetascoreRender(page: Page): Promise<void> {
    await page
      .waitForFunction(
        () => {
          const el = document.querySelector(
            '.three-Elements .score, .metacritic-score-box, .score-box--metacritic'
          );
          return el && el.textContent && el.textContent.trim().length > 0;
        },
        { timeout: 3000 }
      )
      .catch(() => {});
  }

  private evaluateMetascoreDOM(): string {
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
    return 'N/A';
  }

  private parseMetascoreText(text: string, logger: TaskLoggerService): number {
    if (text === 'N/A') {
      logger.warn('⚠️ No se encontró el Metascore.');
      return -1;
    }
    const metascore = parseInt(text, 10);
    if (isNaN(metascore)) return -1;
    logger.log(`✅ Metascore: ${metascore}`);
    return metascore;
  }
}
