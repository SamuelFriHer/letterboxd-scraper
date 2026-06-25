import { Page } from 'puppeteer';
import { ImdbExtractor } from '../../../src/infrastructure/scraping/ImdbExtractor';
import { TaskLoggerService } from '../../../src/domain/ports/LoggerService';

describe('ImdbExtractor', () => {
  let extractor: ImdbExtractor;
  let mockTaskLogger: jest.Mocked<TaskLoggerService>;
  let mockPage: jest.Mocked<Partial<Page>>;

  beforeEach(() => {
    mockPage = {
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn(),
    };

    mockTaskLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      isPersistent: jest.fn(),
      getMessages: jest.fn(),
      getSlug: jest.fn(),
    } as unknown as jest.Mocked<TaskLoggerService>;

    extractor = new ImdbExtractor();
  });

  describe('extractMetascore', () => {
    it('should successfully extract metascore from JSON __NEXT_DATA__', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(true);
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce('87');

      const result = await extractor.extractMetascore(
        mockPage as unknown as Page,
        mockTaskLogger
      );

      expect(result).toBe(87);
      expect(mockTaskLogger.log).toHaveBeenCalledWith('✅ Metascore: 87');
    });

    it('should return -1 if no metascore container exists', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(false);

      const result = await extractor.extractMetascore(
        mockPage as unknown as Page,
        mockTaskLogger
      );

      expect(result).toBe(-1);
      expect(mockTaskLogger.warn).toHaveBeenCalledWith(
        '⚠️ Contenedor de Metascore no hallado.'
      );
    });

    it('should return -1 if metascore text is N/A', async () => {
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce(true);
      (mockPage.evaluate as jest.Mock).mockResolvedValueOnce('N/A');

      const result = await extractor.extractMetascore(
        mockPage as unknown as Page,
        mockTaskLogger
      );

      expect(result).toBe(-1);
      expect(mockTaskLogger.warn).toHaveBeenCalledWith(
        '⚠️ No se encontró el Metascore.'
      );
    });

    it('should return -1 and log error if evaluation fails', async () => {
      (mockPage.evaluate as jest.Mock).mockRejectedValueOnce(
        new Error('Eval failed')
      );

      const result = await extractor.extractMetascore(
        mockPage as unknown as Page,
        mockTaskLogger
      );

      expect(result).toBe(-1);
      expect(mockTaskLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          '⚠️ Metascore no hallado. Error: Error: Eval failed'
        )
      );
    });
  });
});
