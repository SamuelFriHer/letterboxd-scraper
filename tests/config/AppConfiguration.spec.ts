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

    expect(config.timeouts).toEqual({
      selector: 10000,
      pageLoad: 60000,
      retryBase: 5000,
    });

    expect(config.retries).toEqual({
      max: 3,
    });

    expect(config.paths.output).toBe(path.resolve(__dirname, '../../output'));
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
