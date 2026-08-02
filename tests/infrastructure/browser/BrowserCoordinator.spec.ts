import { BrowserCoordinator } from '../../../src/infrastructure/browser/BrowserCoordinator';
import puppeteerExtra from 'puppeteer-extra';
import { Page, Browser, HTTPRequest } from 'puppeteer';

jest.mock('puppeteer-extra', () => ({
  use: jest.fn(),
  launch: jest.fn(),
}));

jest.mock('../../../src/config/AppConfiguration', () => {
  return {
    AppConfiguration: {
      getInstance: jest.fn().mockReturnValue({
        puppeteer: { headless: true },
      }),
    },
  };
});

describe('BrowserCoordinator', () => {
  let coordinator: BrowserCoordinator;
  let mockBrowser: jest.Mocked<Partial<Browser>>;
  let mockPage: jest.Mocked<Partial<Page>>;

  beforeEach(() => {
    mockPage = {
      setRequestInterception: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      close: jest.fn().mockResolvedValue(undefined),
      newPage: jest.fn().mockResolvedValue(mockPage),
      pages: jest.fn().mockResolvedValue([mockPage]),
    };

    (puppeteerExtra.launch as jest.Mock).mockResolvedValue(mockBrowser);
    coordinator = new BrowserCoordinator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if getBrowser is called before initialization', () => {
    expect(() => coordinator.getBrowser()).toThrow(
      'Browser is not initialized.'
    );
  });

  it('should initialize browser via puppeteerExtra', async () => {
    await coordinator.startBrowser();
    expect(puppeteerExtra.launch).toHaveBeenCalledWith({ headless: true });
    expect(coordinator.getBrowser()).toBe(mockBrowser);
  });

  it('should stop browser and clear reference', async () => {
    await coordinator.startBrowser();
    await coordinator.stopBrowser();
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    expect(() => coordinator.getBrowser()).toThrow(
      'Browser is not initialized.'
    );
  });

  it('should return early from cleanupPage if browser is not initialized', async () => {
    const coordinatorWithoutBrowser = new BrowserCoordinator();
    await expect(
      coordinatorWithoutBrowser.cleanupPage()
    ).resolves.not.toThrow();
  });

  it('should cleanup last page ignoring errors', async () => {
    await coordinator.startBrowser();
    await coordinator.cleanupPage();
    expect(mockBrowser.pages).toHaveBeenCalledTimes(1);
    expect(mockPage.close).toHaveBeenCalledTimes(1);
  });

  it('should log error using logger when browser.pages throws an error', async () => {
    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      header: jest.fn(),
      logBatchResults: jest.fn(),
      createTaskLogger: jest.fn(),
    };
    const coordinatorWithLogger = new BrowserCoordinator(mockLogger);
    await coordinatorWithLogger.startBrowser();

    const expectedError = new Error('Failed to retrieve pages');
    mockBrowser.pages = jest.fn().mockRejectedValue(expectedError);

    await coordinatorWithLogger.cleanupPage();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error during page cleanup: Error: Failed to retrieve pages'
      )
    );
  });

  it('should log error to console.error when browser.pages throws an error and no logger is provided', async () => {
    await coordinator.startBrowser();

    const expectedError = new Error('Failed to retrieve pages');
    mockBrowser.pages = jest.fn().mockRejectedValue(expectedError);

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await coordinator.cleanupPage();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error during page cleanup: Error: Failed to retrieve pages'
      )
    );
    consoleErrorSpy.mockRestore();
  });

  it('should log error using logger when lastPage.close throws an error', async () => {
    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      header: jest.fn(),
      logBatchResults: jest.fn(),
      createTaskLogger: jest.fn(),
    };
    const coordinatorWithLogger = new BrowserCoordinator(mockLogger);
    await coordinatorWithLogger.startBrowser();

    const expectedError = new Error('Failed to close page');
    mockPage.close = jest.fn().mockRejectedValue(expectedError);

    await coordinatorWithLogger.cleanupPage();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error during page cleanup: Error: Failed to close page'
      )
    );
  });

  it('should log error to console.error when lastPage.close throws an error and no logger is provided', async () => {
    await coordinator.startBrowser();

    const expectedError = new Error('Failed to close page');
    mockPage.close = jest.fn().mockRejectedValue(expectedError);

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await coordinator.cleanupPage();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error during page cleanup: Error: Failed to close page'
      )
    );
    consoleErrorSpy.mockRestore();
  });

  it('should chunk an array correctly', () => {
    const array = [1, 2, 3, 4, 5];
    const chunks = coordinator.chunk(array, 2);
    expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should validate safe URLs correctly', () => {
    expect(() =>
      coordinator.validateSafeUrl('https://example.com', 'example.com')
    ).not.toThrow();

    expect(() =>
      coordinator.validateSafeUrl('http://example.com', 'example.com')
    ).not.toThrow();

    expect(() =>
      coordinator.validateSafeUrl('https://sub.example.com', 'example.com')
    ).not.toThrow();

    expect(() =>
      coordinator.validateSafeUrl('https://sub.example.com', '.example.com')
    ).not.toThrow();
  });

  it('should throw on invalid URL structure', () => {
    expect(() =>
      coordinator.validateSafeUrl('not-a-url', 'example.com')
    ).toThrow(/Invalid URL: not-a-url\. Details: (TypeError: )?Invalid URL/);
  });

  it('should throw on unsafe protocol', () => {
    expect(() =>
      coordinator.validateSafeUrl('ftp://example.com', 'example.com')
    ).toThrow('Insecure protocol: ftp:');
  });

  it('should throw on mismatched domain', () => {
    expect(() =>
      coordinator.validateSafeUrl('https://malicious.com', 'example.com')
    ).toThrow('Domain not allowed: malicious.com');
  });

  it('should throw on domains ending with the allowedDomain but not as a proper subdomain', () => {
    expect(() =>
      coordinator.validateSafeUrl('https://attackerexample.com', 'example.com')
    ).toThrow('Domain not allowed: attackerexample.com');
  });

  it('should intercept requests in openOptimizedPage', async () => {
    await coordinator.startBrowser();
    const page = await coordinator.openOptimizedPage();

    expect(page.setRequestInterception).toHaveBeenCalledWith(true);
    expect(page.on).toHaveBeenCalledWith('request', expect.anything());

    const requestHandler = (mockPage.on as jest.Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'request'
    )?.[1] as (request: HTTPRequest) => void;

    const mockRequestAbort = jest.fn();
    const mockRequestContinue = jest.fn();

    // Simulate Image request
    requestHandler({
      resourceType: () => 'image',
      abort: mockRequestAbort,
      continue: mockRequestContinue,
    } as unknown as HTTPRequest);
    expect(mockRequestAbort).toHaveBeenCalled();

    mockRequestAbort.mockClear();

    // Simulate HTML request
    requestHandler({
      resourceType: () => 'document',
      abort: mockRequestAbort,
      continue: mockRequestContinue,
    } as unknown as HTTPRequest);
    expect(mockRequestContinue).toHaveBeenCalled();
  });

  it('should intercept heavily in openDetailsOptimizedPage', async () => {
    await coordinator.startBrowser();
    const page = await coordinator.openDetailsOptimizedPage();

    expect(page.setRequestInterception).toHaveBeenCalledWith(true);
    expect(page.on).toHaveBeenCalledWith('request', expect.anything());

    const requestHandler = (mockPage.on as jest.Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'request'
    )?.[1] as (request: HTTPRequest) => void;

    const mockRequestAbort = jest.fn();
    const mockRequestContinue = jest.fn();

    // Simulate Font request
    requestHandler({
      resourceType: () => 'font',
      abort: mockRequestAbort,
      continue: mockRequestContinue,
    } as unknown as HTTPRequest);
    expect(mockRequestAbort).toHaveBeenCalled();
  });
});
