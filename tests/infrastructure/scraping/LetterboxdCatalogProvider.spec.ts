import { Page } from 'puppeteer';
import { LetterboxdCatalogProvider } from '../../../src/infrastructure/scraping/LetterboxdCatalogProvider';
import { BrowserCoordinator } from '../../../src/infrastructure/browser/BrowserCoordinator';
import { LoggerService } from '../../../src/domain/ports/LoggerService';

describe('LetterboxdCatalogProvider', () => {
  let provider: LetterboxdCatalogProvider;
  let mockBrowserCoordinator: jest.Mocked<BrowserCoordinator>;
  let mockLogger: jest.Mocked<LoggerService>;
  let mockPage: jest.Mocked<Partial<Page>>;

  beforeEach(() => {
    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      $: jest.fn().mockResolvedValue(null),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockBrowserCoordinator = {
      validateSafeUrl: jest.fn(),
      openOptimizedPage: jest.fn().mockResolvedValue(mockPage),
      openDetailsOptimizedPage: jest.fn().mockResolvedValue(mockPage),
    } as unknown as jest.Mocked<BrowserCoordinator>;

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      header: jest.fn(),
      createTaskLogger: jest.fn(),
      logBatchResults: jest.fn(),
    } as jest.Mocked<LoggerService>;

    provider = new LetterboxdCatalogProvider(
      mockBrowserCoordinator,
      mockLogger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exploreCatalogPage', () => {
    it('should navigate and extract movies correctly', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce([
        { title: 'The Matrix', link: 'https://letterboxd.com/film/the-matrix' },
      ]);

      const result = await provider.exploreCatalogPage(
        'https://letterboxd.com/films/popular/'
      );

      expect(mockBrowserCoordinator.validateSafeUrl).toHaveBeenCalledWith(
        'https://letterboxd.com/films/popular/',
        'letterboxd.com'
      );
      expect(mockBrowserCoordinator.openOptimizedPage).toHaveBeenCalledTimes(1);
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://letterboxd.com/films/popular/',
        { waitUntil: 'domcontentloaded' }
      );
      expect(mockPage.waitForFunction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Object)
      );
      expect(result).toEqual([
        { title: 'The Matrix', link: 'https://letterboxd.com/film/the-matrix' },
      ]);
      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });

    it('should click cookie consent if button is present', async () => {
      const mockConsentBtn = { click: jest.fn().mockResolvedValue(undefined) };
      (mockPage.$ as jest.Mock).mockResolvedValueOnce(mockConsentBtn);
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce([]);

      await provider.exploreCatalogPage(
        'https://letterboxd.com/films/popular/'
      );

      expect(mockConsentBtn.click).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('consentimiento detectado')
      );
    });

    it('should throw error if waitForFunction times out', async () => {
      (mockPage.waitForFunction as jest.Mock).mockRejectedValueOnce(
        new Error('Timeout')
      );

      await expect(
        provider.exploreCatalogPage('https://letterboxd.com/films/popular/')
      ).rejects.toThrow('Timeout');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Error: Timeout buscando películas.'
      );
    });
  });

  describe('getMovieDetails', () => {
    it('should extract details and imdb link correctly', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(
        'https://www.imdb.com/title/tt0133093/'
      ); // extractImdbLink
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce({
        title: 'The Matrix',
        year: '1999',
        directors: 'Lana Wachowski, Lilly Wachowski',
      }); // extractBasicMovieDetails

      const result = await provider.getMovieDetails(
        'https://letterboxd.com/film/the-matrix'
      );

      expect(
        mockBrowserCoordinator.openDetailsOptimizedPage
      ).toHaveBeenCalledTimes(1);
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://letterboxd.com/film/the-matrix',
        { waitUntil: 'domcontentloaded', timeout: 60000 }
      );
      expect(mockPage.close).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        title: 'The Matrix',
        year: '1999',
        directors: 'Lana Wachowski, Lilly Wachowski',
        imdbLink: 'https://www.imdb.com/title/tt0133093/',
      });
    });

    it('should close page and bubble error if navigation fails', async () => {
      (mockPage.goto as jest.Mock).mockRejectedValueOnce(
        new Error('Navigation Failed')
      );

      await expect(
        provider.getMovieDetails('https://letterboxd.com/film/the-matrix')
      ).rejects.toThrow('Navigation Failed');

      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });

    it('should ignore unsafe IMDb URLs', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(
        'ftp://malicious.com/title/tt0133093/'
      ); // extractImdbLink returns unsafe URL directly

      const providerAny = provider as unknown as {
        validateImdbUrl: (url: string) => string;
      };
      const validUrl = providerAny.validateImdbUrl('ftp://malicious.com/');
      expect(validUrl).toBe('');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Enlace de IMDb no seguro ignorado')
      );
    });

    it('should construct absolute imdb URL if relative', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(
        '/title/tt0133093/'
      );
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce({
        title: 'The Matrix',
      });

      const result = await provider.getMovieDetails(
        'https://letterboxd.com/film/the-matrix'
      );
      expect(result.imdbLink).toBe('https://www.imdb.com/title/tt0133093/');
    });
  });
});
