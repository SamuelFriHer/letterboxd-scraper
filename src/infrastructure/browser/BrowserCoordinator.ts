import { Browser, Page, HTTPRequest } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { AppConfiguration } from '../../config/AppConfiguration';

puppeteerExtra.use(StealthPlugin());

export class BrowserCoordinator {
  private browser: Browser | null = null;
  private config = AppConfiguration.getInstance();

  public async startBrowser(): Promise<void> {
    this.browser = (await puppeteerExtra.launch(
      this.config.puppeteer
    )) as unknown as Browser;
  }

  public async stopBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  public getBrowser(): Browser {
    if (!this.browser) {
      throw new Error('Browser is not initialized.');
    }
    return this.browser;
  }

  public async openOptimizedPage(): Promise<Page> {
    const page = await this.getBrowser().newPage();
    await page.setRequestInterception(true);
    page.on('request', (request: HTTPRequest) => {
      const type = request.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    return page;
  }

  public async openDetailsOptimizedPage(): Promise<Page> {
    const page = await this.getBrowser().newPage();
    await page.setRequestInterception(true);
    page.on('request', (request: HTTPRequest) => {
      const type = request.resourceType();
      const blocked = [
        'image',
        'media',
        'font',
        'stylesheet',
        'script',
        'xhr',
        'fetch',
      ];
      if (blocked.includes(type)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    return page;
  }

  public async cleanupPage(): Promise<void> {
    if (!this.browser) return;
    try {
      const pages = await this.browser.pages();
      const lastPage = pages[pages.length - 1];
      if (lastPage) await lastPage.close();
    } catch (_e) {
      // Keep going on cleanup errors
    }
  }

  public chunk<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  public validateSafeUrl(url: string, allowedDomain: string): void {
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
}
