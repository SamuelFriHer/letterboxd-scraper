import { ConsoleLogger } from '../../../src/infrastructure/logging/ConsoleLogger';

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new ConsoleLogger();
    stdoutWriteSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });

  it('should log standard messages with a newline', () => {
    logger.log('Test message');
    expect(stdoutWriteSpy).toHaveBeenCalledWith('Test message\n');
  });

  it('should log warning messages with a newline', () => {
    logger.warn('Test warning');
    expect(stdoutWriteSpy).toHaveBeenCalledWith('Test warning\n');
  });

  it('should log error messages with a newline', () => {
    logger.error('Test error');
    expect(stdoutWriteSpy).toHaveBeenCalledWith('Test error\n');
  });

  it('should log header messages with a newline', () => {
    logger.header('Test header');
    expect(stdoutWriteSpy).toHaveBeenCalledWith('Test header\n');
  });

  describe('ConsoleTaskLogger', () => {
    it('should create a task logger that records messages but does not output immediately', () => {
      const taskLogger = logger.createTaskLogger('movie-slug');
      taskLogger.log('Processing movie');

      expect(taskLogger.getSlug()).toBe('movie-slug');
      expect(taskLogger.isPersistent()).toBe(false);
      expect(taskLogger.getMessages()).toEqual([
        '🎬 Scrapeando: movie-slug',
        'Processing movie',
      ]);
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });

    it('should mark task as persistent on warning', () => {
      const taskLogger = logger.createTaskLogger('movie-slug');
      taskLogger.warn('Warning message');

      expect(taskLogger.isPersistent()).toBe(true);
      expect(taskLogger.getMessages()).toContain('Warning message');
    });

    it('should mark task as persistent on error', () => {
      const taskLogger = logger.createTaskLogger('movie-slug');
      taskLogger.error('Error message');

      expect(taskLogger.isPersistent()).toBe(true);
      expect(taskLogger.getMessages()).toContain('Error message');
    });
  });

  describe('logBatchResults', () => {
    it('should only log messages from persistent task loggers', () => {
      const task1 = logger.createTaskLogger('slug-1');
      task1.log('All good');

      const task2 = logger.createTaskLogger('slug-2');
      task2.warn('Got a warning');

      const task3 = logger.createTaskLogger('slug-3');
      task3.error('Failed entirely');

      logger.logBatchResults([task1, task2, task3]);

      // task1 is not persistent, should not be logged.
      expect(stdoutWriteSpy).toHaveBeenCalledTimes(2);

      // Verify exact outputs based on the joined messages
      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        '🎬 Scrapeando: slug-2 | Got a warning\n'
      );
      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        '🎬 Scrapeando: slug-3 | Failed entirely\n'
      );
    });
  });
});
