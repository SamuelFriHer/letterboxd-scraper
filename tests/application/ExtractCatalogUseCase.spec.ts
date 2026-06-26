import { ExtractCatalogUseCase } from '../../src/application/ExtractCatalogUseCase';
import { BrowserCoordinator } from '../../src/infrastructure/browser/BrowserCoordinator';
import { CatalogProvider } from '../../src/domain/ports/CatalogProvider';
import { RatingProvider } from '../../src/domain/ports/RatingProvider';
import { MovieStorage } from '../../src/domain/ports/MovieStorage';
import {
  LoggerService,
  TaskLoggerService,
} from '../../src/domain/ports/LoggerService';
import { AppConfiguration } from '../../src/config/AppConfiguration';
import { ScrapingConfiguration } from '../../src/domain/models/ScrapingConfiguration';

describe('ExtractCatalogUseCase', () => {
  let useCase: ExtractCatalogUseCase;
  let mockBrowserCoordinator: jest.Mocked<BrowserCoordinator>;
  let mockCatalogProvider: jest.Mocked<CatalogProvider>;
  let mockRatingProvider: jest.Mocked<RatingProvider>;
  let mockMovieStorage: jest.Mocked<MovieStorage>;
  let mockLogger: jest.Mocked<LoggerService>;
  let mockTaskLogger: jest.Mocked<TaskLoggerService>;

  beforeEach(() => {
    mockBrowserCoordinator = {
      startBrowser: jest.fn(),
      stopBrowser: jest.fn(),
      cleanupPage: jest.fn(),
      chunk: jest.fn().mockImplementation((arr, size) => {
        const res = [];
        for (let i = 0; i < arr.length; i += size)
          res.push(arr.slice(i, i + size));
        return res;
      }),
    } as unknown as jest.Mocked<BrowserCoordinator>;

    mockCatalogProvider = {
      exploreCatalogPage: jest.fn(),
      getMovieDetails: jest.fn(),
    };

    mockRatingProvider = {
      getMetascore: jest.fn(),
    };

    mockMovieStorage = {
      save: jest.fn(),
    };

    mockTaskLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<TaskLoggerService>;

    mockLogger = {
      header: jest.fn(),
      logBatchResults: jest.fn(),
      createTaskLogger: jest.fn().mockReturnValue(mockTaskLogger),
    } as unknown as jest.Mocked<LoggerService>;

    useCase = new ExtractCatalogUseCase(
      mockBrowserCoordinator,
      mockCatalogProvider,
      mockRatingProvider,
      mockMovieStorage,
      mockLogger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should run successful scraping sequence for "popular"', async () => {
      const config: ScrapingConfiguration = {
        option: 'popular',
        yearOrDecade: '',
        pages: 1,
      };

      mockCatalogProvider.exploreCatalogPage.mockResolvedValueOnce([
        {
          title: 'The Matrix',
          link: 'https://letterboxd.com/film/the-matrix/',
        },
      ]);
      mockCatalogProvider.getMovieDetails.mockResolvedValueOnce({
        title: 'The Matrix',
        year: '1999',
        directors: 'A',
        imdbLink: 'https://imdb.com/title/tt0133093',
      });
      mockRatingProvider.getMetascore.mockResolvedValueOnce(85);

      await useCase.execute(config);

      expect(mockBrowserCoordinator.startBrowser).toHaveBeenCalled();
      expect(mockCatalogProvider.exploreCatalogPage).toHaveBeenCalledWith(
        'https://letterboxd.com/films/popular/'
      );
      expect(mockRatingProvider.getMetascore).toHaveBeenCalledWith(
        'https://imdb.com/title/tt0133093',
        mockTaskLogger
      );
      expect(mockMovieStorage.save).toHaveBeenCalledWith(
        [
          {
            title: 'The Matrix',
            year: '1999',
            directors: 'A',
            imdbLink: 'https://imdb.com/title/tt0133093',
            metascore: 85,
          },
        ],
        'popular',
        ''
      );
      expect(mockBrowserCoordinator.stopBrowser).toHaveBeenCalled();
      expect(mockLogger.header).toHaveBeenCalledWith('✅ Scraping finalizado.');
    });

    it('should generate correct URL for "director"', async () => {
      const config: ScrapingConfiguration = {
        option: 'director',
        directorSlug: 'pta',
        yearOrDecade: '',
        pages: 1,
      };
      mockCatalogProvider.exploreCatalogPage.mockResolvedValueOnce([]);

      await useCase.execute(config);

      expect(mockCatalogProvider.exploreCatalogPage).toHaveBeenCalledWith(
        'https://letterboxd.com/director/pta/'
      );
      expect(mockMovieStorage.save).toHaveBeenCalledWith([], 'director', 'pta');
    });

    it('should generate correct URL for "year" and "decade" with pagination', async () => {
      const configYear: ScrapingConfiguration = {
        option: 'year',
        yearOrDecade: '2023',
        pages: 2,
      };
      mockCatalogProvider.exploreCatalogPage.mockResolvedValue([]);

      await useCase.execute(configYear);

      expect(mockCatalogProvider.exploreCatalogPage).toHaveBeenCalledWith(
        'https://letterboxd.com/films/year/2023/'
      );
      expect(mockCatalogProvider.exploreCatalogPage).toHaveBeenCalledWith(
        'https://letterboxd.com/films/year/2023/page/2/'
      );

      const configDecade: ScrapingConfiguration = {
        option: 'decade',
        yearOrDecade: '1990',
        pages: 1,
      };
      await useCase.execute(configDecade);
      expect(mockCatalogProvider.exploreCatalogPage).toHaveBeenCalledWith(
        'https://letterboxd.com/films/popular/decade/1990s/'
      );
    });

    it('should fallback to createFallbackMovie on exceeding retries', async () => {
      const config: ScrapingConfiguration = {
        option: 'popular',
        yearOrDecade: '',
        pages: 1,
      };
      mockCatalogProvider.exploreCatalogPage.mockResolvedValueOnce([
        {
          title: 'Buggy Movie',
          link: 'https://letterboxd.com/film/buggy-movie/',
        },
      ]);

      mockCatalogProvider.getMovieDetails.mockRejectedValue(
        new Error('Persistent error')
      );

      jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((cb: string | ((...args: unknown[]) => void)) => {
          if (typeof cb === 'function') {
            cb();
          }
          return 0 as unknown as ReturnType<typeof setTimeout>;
        });

      await useCase.execute(config);

      jest.restoreAllMocks();

      expect(mockCatalogProvider.getMovieDetails).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(mockBrowserCoordinator.cleanupPage).toHaveBeenCalledTimes(4);
      expect(mockTaskLogger.error).toHaveBeenCalledWith(
        '❌ Failed: buggy-movie'
      );
      expect(mockMovieStorage.save).toHaveBeenCalledWith(
        [
          {
            title: 'buggy movie',
            year: 'Desconocido',
            directors: 'Desconocido',
            imdbLink: '',
            metascore: -1,
          },
        ],
        'popular',
        ''
      );
    });

    it('should respect maxRetries configuration from AppConfiguration', async () => {
      const mockConfig = {
        scraping: {
          catalog: {
            maxRetries: 1,
            retryDelay: 1000,
          },
        },
      };
      const getInstanceSpy = jest
        .spyOn(AppConfiguration, 'getInstance')
        .mockReturnValue(mockConfig as unknown as AppConfiguration);

      const config: ScrapingConfiguration = {
        option: 'director',
        directorSlug: 'christopher-nolan',
        yearOrDecade: '',
        pages: 1,
      };
      mockCatalogProvider.exploreCatalogPage.mockResolvedValueOnce([
        {
          title: 'Buggy Movie',
          link: 'https://letterboxd.com/film/buggy-movie/',
        },
      ]);

      mockCatalogProvider.getMovieDetails.mockRejectedValue(
        new Error('Persistent error')
      );

      jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((cb: string | ((...args: unknown[]) => void)) => {
          if (typeof cb === 'function') {
            cb();
          }
          return 0 as unknown as ReturnType<typeof setTimeout>;
        });

      await useCase.execute(config);

      jest.restoreAllMocks();
      getInstanceSpy.mockRestore();

      expect(mockCatalogProvider.getMovieDetails).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
      expect(mockBrowserCoordinator.cleanupPage).toHaveBeenCalledTimes(2);
      expect(mockTaskLogger.error).toHaveBeenCalledWith(
        '❌ Failed: buggy-movie'
      );
    });
  });
});
