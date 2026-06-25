import { Page, Browser } from 'puppeteer';
import { ImdbRatingProvider } from '../../../src/infrastructure/scraping/ImdbRatingProvider';
import { BrowserCoordinator } from '../../../src/infrastructure/browser/BrowserCoordinator';
import { TaskLoggerService } from '../../../src/domain/ports/LoggerService';

interface ImdbRatingProviderPrivate {
  activeImdbRequests: number;
  imdbQueue: (() => void)[];
  isHandlingCookies: boolean;
  imdbCookiesHandled: boolean;
  imdbCookiesAttempted: boolean;
  acquireImdbPermit(): Promise<void>;
  releaseImdbPermit(): void;
  ensureImdbCookies(): Promise<void>;
}

describe('ImdbRatingProvider', () => {
  let provider: ImdbRatingProvider;
  let mockBrowserCoordinator: jest.Mocked<BrowserCoordinator>;
  let mockTaskLogger: jest.Mocked<TaskLoggerService>;
  let mockPage: jest.Mocked<Partial<Page>>;
  let mockBrowser: jest.Mocked<Partial<Browser>>;

  beforeEach(() => {
    mockPage = {
      setRequestInterception: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      goto: jest.fn().mockResolvedValue(undefined),
      $: jest.fn().mockResolvedValue(null),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
    };

    mockBrowserCoordinator = {
      validateSafeUrl: jest.fn(),
      getBrowser: jest.fn().mockReturnValue(mockBrowser),
      cleanupPage: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<BrowserCoordinator>;

    mockTaskLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      isPersistent: jest.fn(),
      getMessages: jest.fn(),
      getSlug: jest.fn(),
    } as jest.Mocked<TaskLoggerService>;

    provider = new ImdbRatingProvider(mockBrowserCoordinator);
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((cb: string | ((...args: unknown[]) => void)) => {
        if (typeof cb === 'function') {
          cb();
        }
        return 0 as unknown as ReturnType<typeof setTimeout>;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('getMetascore', () => {
    it('should successfully extract metascore on first attempt', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(true); // checkMetascoreExists -> true
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce('85'); // evaluateMetascoreDOM -> '85'

      const result = await provider.getMetascore(
        'https://www.imdb.com/title/tt1234567/',
        mockTaskLogger
      );

      expect(mockBrowserCoordinator.validateSafeUrl).toHaveBeenCalledWith(
        'https://www.imdb.com/title/tt1234567/',
        'imdb.com'
      );
      expect(result).toBe(85);
      expect(mockTaskLogger.log).toHaveBeenCalledWith('✅ Metascore: 85');
      expect(mockPage.close).toHaveBeenCalledTimes(2); // 1 for ensureCookies, 1 for actual page
    });

    it('should return -1 if metascore text is N/A', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(true); // hasContainer = true
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce('N/A'); // evaluateMetascoreDOM

      const result = await provider.getMetascore(
        'https://www.imdb.com/title/tt1234567/',
        mockTaskLogger
      );

      expect(result).toBe(-1);
      expect(mockTaskLogger.warn).toHaveBeenCalledWith(
        '⚠️ No se encontró el Metascore.'
      );
    });

    it('should return -1 if container does not exist', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(false); // hasContainer = false

      const result = await provider.getMetascore(
        'https://www.imdb.com/title/tt1234567/',
        mockTaskLogger
      );

      expect(result).toBe(-1);
      expect(mockTaskLogger.warn).toHaveBeenCalledWith(
        '⚠️ Contenedor de Metascore no hallado.'
      );
    });

    it('should retry on failure and eventually error returning -1', async () => {
      (mockPage.goto as jest.Mock).mockRejectedValue(
        new Error('Network error')
      ); // Make goto fail every time

      const result = await provider.getMetascore(
        'https://www.imdb.com/title/tt1234567/',
        mockTaskLogger
      );

      expect(result).toBe(-1);
      expect(mockTaskLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error al cargar IMDb. Reintento')
      );
      expect(mockTaskLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo cargar IMDb después de 2 intentos.')
      );
    });
  });

  describe('concurrency permit management', () => {
    it('should acquire permits up to the limit immediately', async () => {
      const providerUnderTest =
        provider as unknown as ImdbRatingProviderPrivate;

      expect(providerUnderTest.activeImdbRequests).toBe(0);

      await providerUnderTest.acquireImdbPermit();
      expect(providerUnderTest.activeImdbRequests).toBe(1);

      await providerUnderTest.acquireImdbPermit();
      expect(providerUnderTest.activeImdbRequests).toBe(2);
    });

    it('should queue subsequent permit requests when limit is exceeded', async () => {
      const providerUnderTest =
        provider as unknown as ImdbRatingProviderPrivate;

      // Acquire initial 2 permits to reach the concurrency limit
      await providerUnderTest.acquireImdbPermit();
      await providerUnderTest.acquireImdbPermit();
      expect(providerUnderTest.activeImdbRequests).toBe(2);
      expect(providerUnderTest.imdbQueue.length).toBe(0);

      // Request 3rd permit - should be queued and not resolved immediately
      let thirdPermitResolved = false;
      const thirdPermitPromise = providerUnderTest
        .acquireImdbPermit()
        .then(() => {
          thirdPermitResolved = true;
        });

      // Flush microtasks
      await Promise.resolve();
      expect(thirdPermitResolved).toBe(false);
      expect(providerUnderTest.imdbQueue.length).toBe(1);

      // Release one permit, which should trigger the third one to resolve
      providerUnderTest.releaseImdbPermit();

      await thirdPermitPromise;
      expect(thirdPermitResolved).toBe(true);
      expect(providerUnderTest.activeImdbRequests).toBe(2);
      expect(providerUnderTest.imdbQueue.length).toBe(0);
    });

    it('should correctly decrement active requests on release when queue is empty', async () => {
      const providerUnderTest =
        provider as unknown as ImdbRatingProviderPrivate;

      await providerUnderTest.acquireImdbPermit();
      expect(providerUnderTest.activeImdbRequests).toBe(1);

      providerUnderTest.releaseImdbPermit();
      expect(providerUnderTest.activeImdbRequests).toBe(0);
      expect(providerUnderTest.imdbQueue.length).toBe(0);
    });
  });

  describe('ensureImdbCookies concurrency and consent', () => {
    it('should wait for concurrent cookie handling to complete and not trigger a second handle', async () => {
      const providerUnderTest =
        provider as unknown as ImdbRatingProviderPrivate;

      let resolveFirstNewPage!: (value: unknown) => void;
      const firstNewPagePromise = new Promise<unknown>((resolve) => {
        resolveFirstNewPage = resolve;
      });

      (mockBrowser.newPage as jest.Mock)
        .mockImplementationOnce(() => firstNewPagePromise)
        .mockResolvedValue(mockPage);

      const firstCall = providerUnderTest.ensureImdbCookies();

      expect(providerUnderTest.isHandlingCookies).toBe(true);

      const secondCall = providerUnderTest.ensureImdbCookies();

      resolveFirstNewPage(mockPage);

      await Promise.all([firstCall, secondCall]);

      expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
      expect(providerUnderTest.isHandlingCookies).toBe(false);
      expect(providerUnderTest.imdbCookiesHandled).toBe(true);
    });

    it('should click consent button if present and wait', async () => {
      const providerUnderTest =
        provider as unknown as ImdbRatingProviderPrivate;

      const mockClick = jest.fn().mockResolvedValue(undefined);
      (mockPage.$ as jest.Mock).mockResolvedValueOnce({
        click: mockClick,
      });

      await providerUnderTest.ensureImdbCookies();

      expect(mockPage.$).toHaveBeenCalledWith('[data-testid="accept-button"]');
      expect(mockClick).toHaveBeenCalled();
    });
  });
});
