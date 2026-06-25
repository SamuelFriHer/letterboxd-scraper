import { CsvMovieStorage } from '../../../src/infrastructure/storage/CsvMovieStorage';
import fs from 'fs';
import { createObjectCsvWriter } from 'csv-writer';

jest.mock('fs');
jest.mock('csv-writer');

jest.mock('../../../src/config/AppConfiguration', () => {
  return {
    AppConfiguration: {
      getInstance: jest.fn().mockReturnValue({
        paths: { output: 'test-output' },
      }),
    },
  };
});

describe('CsvMovieStorage', () => {
  let storage: CsvMovieStorage;
  let mockWriteRecords: jest.Mock;

  beforeEach(() => {
    storage = new CsvMovieStorage();
    mockWriteRecords = jest.fn().mockResolvedValue(undefined);
    (createObjectCsvWriter as jest.Mock).mockReturnValue({
      writeRecords: mockWriteRecords,
    });

    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should abort save if no movies have metascore > 80', async () => {
    const movies = [
      {
        title: 'Bad Movie',
        year: '2000',
        directors: 'A',
        metascore: 50,
        imdbLink: '',
      },
    ];
    await storage.save(movies, 'popular');
    expect(createObjectCsvWriter).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Ninguna película tiene Metascore > 80')
    );
  });

  it('should abort save if input movies array is empty', async () => {
    await storage.save([], 'popular');
    expect(createObjectCsvWriter).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Ninguna película tiene Metascore > 80')
    );
  });

  it('should create output directory if it does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const movies = [
      {
        title: 'Good Movie',
        year: '2000',
        directors: 'A',
        metascore: 90,
        imdbLink: '',
      },
    ];

    await storage.save(movies, 'popular');

    expect(fs.mkdirSync).toHaveBeenCalledWith('test-output', {
      recursive: true,
    });
  });

  it('should write CSV with correct filename for popular option', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const movies = [
      {
        title: 'Good Movie',
        year: '2000',
        directors: 'A',
        metascore: 90,
        imdbLink: '',
      },
    ];

    await storage.save(movies, 'popular');

    expect(createObjectCsvWriter).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('popular.csv'),
      })
    );
    expect(mockWriteRecords).toHaveBeenCalledWith(movies);
  });

  it('should write CSV with correct filename and dir for year option', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const movies = [
      {
        title: 'Good Movie',
        year: '2023',
        directors: 'A',
        metascore: 90,
        imdbLink: '',
      },
    ];

    await storage.save(movies, 'year', '2023');

    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(createObjectCsvWriter).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('year_2023.csv'),
      })
    );
  });

  it('should write CSV with correct filename for director option', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const movies = [
      {
        title: 'Good Movie',
        year: '1999',
        directors: 'A',
        metascore: 90,
        imdbLink: '',
      },
    ];

    await storage.save(movies, 'director', 'pta');

    expect(createObjectCsvWriter).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('director_pta.csv'),
      })
    );
  });

  it('should correctly sanitize fields with leading whitespaces to prevent formula injection', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const movies = [
      {
        title: '   =cmd|/c calc.exe!A0',
        year: ' 2000',
        directors: '\t@SUM(1,1)',
        metascore: 90,
        imdbLink: '  +A1',
      },
    ];

    await storage.save(movies, 'popular');

    expect(mockWriteRecords).toHaveBeenCalledWith([
      {
        title: "'   =cmd|/c calc.exe!A0",
        year: ' 2000',
        directors: "'\t@SUM(1,1)",
        metascore: 90,
        imdbLink: "'  +A1",
      },
    ]);
  });
});
