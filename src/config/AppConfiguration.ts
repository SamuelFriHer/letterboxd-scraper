import path from 'path';

/**
 * Singleton configuration provider serving global application variables and paths.
 */
export class AppConfiguration {
  private static readonly instance = new AppConfiguration();

  public readonly puppeteer = {
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: ['--disable-dev-shm-usage'],
  };

  public readonly paths = {
    output: path.resolve(__dirname, '../../output'),
  };

  public readonly scraping = {
    catalog: {
      maxRetries: process.env.SCRAPING_CATALOG_MAX_RETRIES
        ? parseInt(process.env.SCRAPING_CATALOG_MAX_RETRIES, 10)
        : 3,
      retryDelay: process.env.SCRAPING_CATALOG_RETRY_DELAY
        ? parseInt(process.env.SCRAPING_CATALOG_RETRY_DELAY, 10)
        : 5000,
    },
    imdb: {
      maxRetries: process.env.SCRAPING_IMDB_MAX_RETRIES
        ? parseInt(process.env.SCRAPING_IMDB_MAX_RETRIES, 10)
        : 2,
      retryDelay: process.env.SCRAPING_IMDB_RETRY_DELAY
        ? parseInt(process.env.SCRAPING_IMDB_RETRY_DELAY, 10)
        : 3000,
    },
  };

  private constructor() {}

  /**
   * Retrieves the singular instantiation of the active configuration properties.
   * @returns The application configuration singleton object.
   */
  public static getInstance(): AppConfiguration {
    return AppConfiguration.instance;
  }
}
