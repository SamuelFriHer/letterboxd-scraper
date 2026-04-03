import { Page, Browser } from 'puppeteer';
import { ImdbRatingProvider } from '../../../src/infrastructure/scraping/ImdbRatingProvider';
import { BrowserCoordinator } from '../../../src/infrastructure/browser/BrowserCoordinator';
import { TaskLoggerService } from '../../../src/domain/ports/LoggerService';

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
      waitForNavigation: jest.fn().mockResolvedValue(undefined),
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
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(true); // checkMetascoreFastFail -> true
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
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(true); // checkMetascoreFastFail -> true
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(true); // checkMetascoreExists -> true
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

    it('should return -1 if container does not exist initially (fast fail)', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(false); // hasContainerFast = false

      const result = await provider.getMetascore(
        'https://www.imdb.com/title/tt1234567/',
        mockTaskLogger
      );

      expect(result).toBe(-1);
      expect(mockTaskLogger.warn).toHaveBeenCalledWith(
        '⚠️ Contenedor de Metascore no hallado en carga inicial (SSR).'
      );
    });

    it('should return -1 if container does not exist after wait', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(true); // hasContainerFast = true
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
});
