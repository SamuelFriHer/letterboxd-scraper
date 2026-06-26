import path from 'path';
import { AppConfiguration } from '../../src/config/AppConfiguration';

describe('AppConfiguration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return the same singleton instance', () => {
    const instanceA = AppConfiguration.getInstance();
    const instanceB = AppConfiguration.getInstance();
    expect(instanceA).toBe(instanceB);
  });

  it('should have the expected default configuration properties', () => {
    const config = AppConfiguration.getInstance();

    expect(config.puppeteer).toEqual({
      headless: true,
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--disable-dev-shm-usage'],
    });

    expect(config.paths.output).toBe(path.resolve(__dirname, '../../output'));

    expect(config.scraping.catalog).toEqual({
      maxRetries: 3,
      retryDelay: 5000,
    });

    expect(config.scraping.imdb).toEqual({
      maxRetries: 2,
      retryDelay: 3000,
    });
  });

  it('should respect the scraping environment variables', () => {
    process.env.SCRAPING_CATALOG_MAX_RETRIES = '5';
    process.env.SCRAPING_CATALOG_RETRY_DELAY = '10000';
    process.env.SCRAPING_IMDB_MAX_RETRIES = '1';
    process.env.SCRAPING_IMDB_RETRY_DELAY = '1500';

    let configInstance: AppConfiguration | undefined;
    jest.isolateModules(() => {
      const { AppConfiguration: IsolateAppConfiguration } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../../src/config/AppConfiguration') as typeof import('../../src/config/AppConfiguration');
      configInstance = IsolateAppConfiguration.getInstance();
    });

    expect(configInstance).toBeDefined();
    expect(configInstance?.scraping.catalog).toEqual({
      maxRetries: 5,
      retryDelay: 10000,
    });
    expect(configInstance?.scraping.imdb).toEqual({
      maxRetries: 1,
      retryDelay: 1500,
    });
  });

  it('should respect the PUPPETEER_EXECUTABLE_PATH environment variable', () => {
    const customPath = '/custom/path/to/chromium';
    process.env.PUPPETEER_EXECUTABLE_PATH = customPath;

    let configInstance: AppConfiguration | undefined;
    jest.isolateModules(() => {
      const { AppConfiguration: IsolateAppConfiguration } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../../src/config/AppConfiguration') as typeof import('../../src/config/AppConfiguration');
      configInstance = IsolateAppConfiguration.getInstance();
    });

    expect(configInstance).toBeDefined();
    expect(configInstance?.puppeteer.executablePath).toBe(customPath);
  });
});
