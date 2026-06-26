import { Browser, Page, HTTPRequest } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { AppConfiguration } from '../../config/AppConfiguration';
import { LoggerService } from '../../domain/ports/LoggerService';

puppeteerExtra.use(StealthPlugin());

/**
 * Coordinates and manages the lifecycle of the Puppeteer browser instance.
 */
export class BrowserCoordinator {
  private static readonly OPTIMIZED_BLOCKED_RESOURCES: readonly string[] = [
    'image',
    'media',
    'font',
    'stylesheet',
  ];

  private static readonly DETAILS_BLOCKED_RESOURCES: readonly string[] = [
    'image',
    'media',
    'font',
    'stylesheet',
    'script',
    'xhr',
    'fetch',
  ];

  private browser: Browser | null = null;
  private config: AppConfiguration = AppConfiguration.getInstance();

  constructor(private readonly logger?: LoggerService) {}

  /**
   * Initializes and launches the underlying browser process.
   * @returns A promise that resolves when the browser rests ready.
   */
  public async startBrowser(): Promise<void> {
    this.browser = (await puppeteerExtra.launch(
      this.config.puppeteer
    )) as unknown as Browser;
  }

  /**
   * Gracefully shuts down the active browser instance and its descendants.
   * @returns A promise that resolves after the teardown routine.
   */
  public async stopBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Exposes the raw browser instance to strictly native delegates.
   * @returns The Puppeteer browser element.
   * @throws Error if the browser context remains uninitialized.
   */
  public getBrowser(): Browser {
    if (!this.browser) {
      throw new Error('Browser is not initialized.');
    }
    return this.browser;
  }

  /**
   * Opens a partially optimized browser tab that only loads minimal DOM and scripts.
   * @returns A promise resolving to the actively intercepted Puppeteer page.
   */
  public async openOptimizedPage(): Promise<Page> {
    const page: Page = await this.getBrowser().newPage();
    await page.setRequestInterception(true);
    page.on('request', (request: HTTPRequest): void => {
      const type: string = request.resourceType();
      if (BrowserCoordinator.OPTIMIZED_BLOCKED_RESOURCES.includes(type)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    return page;
  }

  /**
   * Opens an extremely lightweight, aggressive-intercepted page ideal for scraping text payload only.
   * @returns A promise resolving to the completely stripped Puppeteer page.
   */
  public async openDetailsOptimizedPage(): Promise<Page> {
    const page: Page = await this.getBrowser().newPage();
    await page.setRequestInterception(true);
    page.on('request', (request: HTTPRequest): void => {
      const type: string = request.resourceType();
      if (BrowserCoordinator.DETAILS_BLOCKED_RESOURCES.includes(type)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    return page;
  }

  /**
   * Securely cleans up dangling or recently used terminal pages to avoid exhausting resources.
   * @returns A promise encapsulating the safe closure cycle.
   */
  public async cleanupPage(): Promise<void> {
    if (!this.browser) return;
    try {
      const pages: Page[] = await this.browser.pages();
      const lastPage: Page | undefined = pages[pages.length - 1];
      if (lastPage) await lastPage.close();
    } catch (error: unknown) {
      const message: string =
        error instanceof Error ? error.stack || error.message : String(error);
      if (this.logger) {
        this.logger.error(`Error during page cleanup: ${message}`);
      } else {
        console.error(`Error during page cleanup: ${message}`);
      }
    }
  }

  /**
   * Splits an array of elements into consecutive batches of a deterministic size.
   * @param array The collection to be portioned.
   * @param size The maximum integer magnitude for each output subgroup.
   * @returns A matrix consisting of the sequential subgroups.
   */
  public chunk<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i: number = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  /**
   * Validates if a target URL safely belongs strictly to the targeted environment.
   * @param url The raw destination address.
   * @param allowedDomain A string boundary denoting the top-level allowed authority.
   * @throws Error upon protocol or domain mismatch.
   */
  public validateSafeUrl(url: string, allowedDomain: string): void {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error: unknown) {
      const message: string =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid URL: ${url}. Details: ${message}`, {
        cause: error,
      });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(`Insecure protocol: ${parsedUrl.protocol}`);
    }

    const exactDomain: string = allowedDomain.startsWith('.')
      ? allowedDomain.slice(1)
      : allowedDomain;
    if (
      parsedUrl.hostname !== exactDomain &&
      !parsedUrl.hostname.endsWith(`.${exactDomain}`)
    ) {
      throw new Error(`Domain not allowed: ${parsedUrl.hostname}`);
    }
  }
}
