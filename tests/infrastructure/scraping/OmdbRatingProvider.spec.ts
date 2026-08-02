import { OmdbRatingProvider } from '../../../src/infrastructure/scraping/OmdbRatingProvider';
import { OmdbRatingService } from '../../../src/infrastructure/scraping/OmdbRatingService';
import { TaskLoggerService } from '../../../src/domain/ports/LoggerService';

describe('OmdbRatingProvider', () => {
  let provider: OmdbRatingProvider;
  let mockOmdbService: jest.Mocked<OmdbRatingService>;
  let mockTaskLogger: jest.Mocked<TaskLoggerService>;

  beforeEach(() => {
    mockOmdbService = {
      fetchMetascore: jest.fn(),
    } as unknown as jest.Mocked<OmdbRatingService>;

    mockTaskLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      isPersistent: jest.fn(),
      getMessages: jest.fn(),
      getSlug: jest.fn(),
    } as jest.Mocked<TaskLoggerService>;

    provider = new OmdbRatingProvider(mockOmdbService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should extract IMDb ID and delegate fetching to OmdbRatingService', async () => {
    mockOmdbService.fetchMetascore.mockResolvedValue(90);

    const score = await provider.getMetascore(
      'http://www.imdb.com/title/tt15398776/maindetails',
      mockTaskLogger
    );

    expect(score).toBe(90);
    expect(mockOmdbService.fetchMetascore).toHaveBeenCalledWith(
      'tt15398776',
      mockTaskLogger
    );
    expect(mockTaskLogger.log).toHaveBeenCalledWith(
      '🔍 Buscando Metascore vía OMDb API...'
    );
  });

  it('should return -1 and warn when URL does not contain valid IMDb ID', async () => {
    const score = await provider.getMetascore(
      'http://www.imdb.com/title/invalid/',
      mockTaskLogger
    );

    expect(score).toBe(-1);
    expect(mockTaskLogger.warn).toHaveBeenCalledWith(
      '⚠️ Enlace de IMDb no contiene identificador válido.'
    );
    expect(mockOmdbService.fetchMetascore).not.toHaveBeenCalled();
  });
});
