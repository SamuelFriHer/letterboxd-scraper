import { Page } from 'puppeteer';
import { LetterboxdCatalogProvider } from '../../../src/infrastructure/scraping/LetterboxdCatalogProvider';
import { BrowserCoordinator } from '../../../src/infrastructure/browser/BrowserCoordinator';
import { LoggerService } from '../../../src/domain/ports/LoggerService';

interface GlobalWithDocument {
  document?: unknown;
}

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
      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '.posteritem, .tooltip.griditem',
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

    it('should log warning if cookie consent handling throws an error', async () => {
      (mockPage.$ as jest.Mock).mockRejectedValueOnce(
        new Error('Selector error')
      );
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce([]);

      await provider.exploreCatalogPage(
        'https://letterboxd.com/films/popular/'
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error processing cookie consent dialog: Selector error'
        )
      );
    });

    it('should throw error if waitForSelector times out', async () => {
      (mockPage.waitForSelector as jest.Mock).mockRejectedValueOnce(
        new Error('Timeout')
      );

      await expect(
        provider.exploreCatalogPage('https://letterboxd.com/films/popular/')
      ).rejects.toThrow('Timeout');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Error: Timeout buscando películas.'
      );
    });

    it('should extract movies from DOM elements using extractMoviesFromPage', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce([]);

      await provider.exploreCatalogPage(
        'https://letterboxd.com/films/popular/'
      );

      const evalFn = (mockPage.evaluate as jest.Mock).mock.calls[0]?.[0];
      expect(evalFn).toBeDefined();

      const globalWithDoc = global as unknown as GlobalWithDocument;
      const originalDocument = globalWithDoc.document;

      try {
        const mockMovieComponent1 = {
          getAttribute: jest.fn().mockImplementation((attr: string) => {
            if (attr === 'data-item-name') return 'The Matrix';
            if (attr === 'data-item-link') return '/film/the-matrix';
            return null;
          }),
        };
        const mockMovieElement1 = {
          querySelector: jest.fn().mockReturnValue(mockMovieComponent1),
        };

        const mockMovieComponent2 = {
          getAttribute: jest.fn().mockImplementation((attr: string) => {
            if (attr === 'data-item-name') return '';
            if (attr === 'data-item-link') return '/film/fight-club';
            return null;
          }),
        };
        const mockMovieElement2 = {
          querySelector: jest.fn().mockReturnValue(mockMovieComponent2),
        };

        const mockMovieElement3 = {
          querySelector: jest.fn().mockReturnValue(null),
        };

        const mockQuerySelectorAll = jest
          .fn()
          .mockReturnValue([
            mockMovieElement1,
            mockMovieElement2,
            mockMovieElement3,
          ]);

        globalWithDoc.document = {
          querySelectorAll: mockQuerySelectorAll,
        };

        const result = evalFn();
        expect(result).toEqual([
          {
            title: 'The Matrix',
            link: 'https://letterboxd.com/film/the-matrix',
          },
        ]);
        expect(mockQuerySelectorAll).toHaveBeenCalledWith(
          '.posteritem, .tooltip.griditem'
        );
        expect(mockMovieElement1.querySelector).toHaveBeenCalledWith(
          '.react-component'
        );
      } finally {
        globalWithDoc.document = originalDocument;
      }
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

    it('should fallback to default values in extractBasicMovieDetails when DOM elements are null', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(
        'https://www.imdb.com/title/tt0133093/'
      );
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce({
        title: 'Dummy',
        year: '2000',
        directors: '',
      });

      await provider.getMovieDetails('https://letterboxd.com/film/the-matrix');

      const evalFn = (mockPage.evaluate as jest.Mock).mock.calls[1]?.[0];
      expect(evalFn).toBeDefined();

      const globalWithDoc = global as unknown as GlobalWithDocument;
      const originalDocument = globalWithDoc.document;
      const mockQuerySelector = jest.fn().mockReturnValue(null);
      const mockQuerySelectorAll = jest.fn().mockReturnValue([]);

      globalWithDoc.document = {
        querySelector: mockQuerySelector,
        querySelectorAll: mockQuerySelectorAll,
      };

      try {
        const result = evalFn();
        expect(result).toEqual({
          title: 'Desconocido',
          year: 'Desconocido',
          directors: '',
        });
        expect(mockQuerySelector).toHaveBeenCalledWith(
          'h1.headline-1.primaryname span.name'
        );
        expect(mockQuerySelector).toHaveBeenCalledWith('span.releasedate a');
        expect(mockQuerySelectorAll).toHaveBeenCalledWith(
          '.credits a.contributor[href^="/director/"]'
        );
      } finally {
        globalWithDoc.document = originalDocument;
      }
    });

    it('should extract movie details correctly in extractBasicMovieDetails when DOM elements exist', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(
        'https://www.imdb.com/title/tt0133093/'
      );
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce({
        title: 'Dummy',
        year: '2000',
        directors: '',
      });

      await provider.getMovieDetails('https://letterboxd.com/film/the-matrix');

      const evalFn = (mockPage.evaluate as jest.Mock).mock.calls[1]?.[0];
      expect(evalFn).toBeDefined();

      const globalWithDoc = global as unknown as GlobalWithDocument;
      const originalDocument = globalWithDoc.document;
      const mockTitleElement = { textContent: '  The Matrix   ' };
      const mockYearElement = { textContent: ' \n 1999 \t' };
      const mockDirector1 = { textContent: '  Lana Wachowski  ' };
      const mockDirector2 = { textContent: '  Lilly Wachowski  ' };

      const mockQuerySelector = jest
        .fn()
        .mockImplementation((selector: string) => {
          if (selector === 'h1.headline-1.primaryname span.name') {
            return mockTitleElement;
          }
          if (selector === 'span.releasedate a') {
            return mockYearElement;
          }
          return null;
        });

      const mockQuerySelectorAll = jest
        .fn()
        .mockImplementation((selector: string) => {
          if (selector === '.credits a.contributor[href^="/director/"]') {
            return [mockDirector1, mockDirector2];
          }
          return [];
        });

      globalWithDoc.document = {
        querySelector: mockQuerySelector,
        querySelectorAll: mockQuerySelectorAll,
      };

      try {
        const result = evalFn();
        expect(result).toEqual({
          title: 'The Matrix',
          year: '1999',
          directors: 'Lana Wachowski, Lilly Wachowski',
        });
      } finally {
        globalWithDoc.document = originalDocument;
      }
    });

    it('should extract IMDb link using querySelector', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(
        'https://www.imdb.com/title/tt0133093/'
      );
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce({
        title: 'Dummy',
        year: '2000',
        directors: '',
      });

      await provider.getMovieDetails('https://letterboxd.com/film/the-matrix');

      const extractImdbLinkFn = (mockPage.evaluate as jest.Mock).mock
        .calls[0]?.[0];
      expect(extractImdbLinkFn).toBeDefined();

      const globalWithDoc = global as unknown as GlobalWithDocument;
      const originalDocument = globalWithDoc.document;

      try {
        const mockEl = {
          getAttribute: jest
            .fn()
            .mockReturnValue('https://www.imdb.com/title/tt0133093/'),
        };
        const mockQuerySelector = jest.fn().mockReturnValue(mockEl);

        globalWithDoc.document = {
          querySelector: mockQuerySelector,
        };

        let result = extractImdbLinkFn();
        expect(result).toBe('https://www.imdb.com/title/tt0133093/');
        expect(mockQuerySelector).toHaveBeenCalledWith(
          'a[href*="imdb.com/title/"], a[href*="imdb.com/title"]'
        );

        mockQuerySelector.mockReturnValue(null);
        result = extractImdbLinkFn();
        expect(result).toBe('');
      } finally {
        globalWithDoc.document = originalDocument;
      }
    });

    it('should return empty string if URL parsing fails in validateImdbUrl', () => {
      const providerAny = provider as unknown as {
        validateImdbUrl: (url: string) => string;
      };
      const validUrl = providerAny.validateImdbUrl('not-a-valid-url');
      expect(validUrl).toBe('');
    });
  });
});
