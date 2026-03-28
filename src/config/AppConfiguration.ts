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

  public readonly timeouts = {
    selector: 10000,
    pageLoad: 60000,
    retryBase: 5000,
  };

  public readonly retries = {
    max: 3,
  };

  public readonly paths = {
    output: path.resolve(__dirname, '../../output'),
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
