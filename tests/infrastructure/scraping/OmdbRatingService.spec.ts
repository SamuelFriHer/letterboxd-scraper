import { OmdbRatingService } from '../../../src/infrastructure/scraping/OmdbRatingService';
import { TaskLoggerService } from '../../../src/domain/ports/LoggerService';

describe('OmdbRatingService', () => {
  let service: OmdbRatingService;
  let mockTaskLogger: jest.Mocked<TaskLoggerService>;

  beforeEach(() => {
    service = new OmdbRatingService();
    mockTaskLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      isPersistent: jest.fn(),
      getMessages: jest.fn(),
      getSlug: jest.fn(),
    } as jest.Mocked<TaskLoggerService>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return Metascore when OMDb API returns valid score', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        Response: 'True',
        Metascore: '90',
      }),
    };
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(mockResponse as unknown as Response);

    const score = await service.fetchMetascore('tt15398776', mockTaskLogger);

    expect(score).toBe(90);
    expect(mockTaskLogger.log).toHaveBeenCalledWith(
      '✅ Metascore (vía OMDb): 90'
    );
  });

  it('should return -1 when OMDb API returns Metascore N/A', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        Response: 'True',
        Metascore: 'N/A',
      }),
    };
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(mockResponse as unknown as Response);

    const score = await service.fetchMetascore('tt1234567', mockTaskLogger);

    expect(score).toBe(-1);
  });

  it('should return -1 when response is not ok or throws exception', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const score = await service.fetchMetascore('tt1234567', mockTaskLogger);

    expect(score).toBe(-1);
  });
});
