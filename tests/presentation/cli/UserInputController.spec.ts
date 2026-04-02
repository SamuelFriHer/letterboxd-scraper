import { UserInputController } from '../../../src/presentation/cli/UserInputController';
import readlineSync from 'readline-sync';

jest.mock('readline-sync');

describe('UserInputController', () => {
  let controller: UserInputController;

  beforeEach(() => {
    controller = new UserInputController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully prompt for popular configuration', () => {
    (readlineSync.question as jest.Mock).mockReturnValueOnce('popular');
    (readlineSync.question as jest.Mock).mockReturnValueOnce('3');

    const config = controller.promptConfiguration();

    expect(config).toEqual({
      option: 'popular',
      yearOrDecade: '',
      directorSlug: undefined,
      pages: 3,
    });
  });

  it('should successfully prompt for year configuration', () => {
    (readlineSync.question as jest.Mock).mockReturnValueOnce('year');
    (readlineSync.question as jest.Mock).mockReturnValueOnce('2023');
    (readlineSync.question as jest.Mock).mockReturnValueOnce('1');

    const config = controller.promptConfiguration();

    expect(config).toEqual({
      option: 'year',
      yearOrDecade: '2023',
      directorSlug: undefined,
      pages: 1,
    });
  });

  it('should successfully prompt for decade configuration', () => {
    (readlineSync.question as jest.Mock).mockReturnValueOnce('decade');
    (readlineSync.question as jest.Mock).mockReturnValueOnce('1990');
    (readlineSync.question as jest.Mock).mockReturnValueOnce('2');

    const config = controller.promptConfiguration();

    expect(config).toEqual({
      option: 'decade',
      yearOrDecade: '1990',
      directorSlug: undefined,
      pages: 2,
    });
  });

  it('should successfully prompt for director configuration', () => {
    (readlineSync.question as jest.Mock).mockReturnValueOnce('director');
    (readlineSync.question as jest.Mock).mockReturnValueOnce(
      'paul-thomas-anderson'
    );

    const config = controller.promptConfiguration();

    expect(config).toEqual({
      option: 'director',
      yearOrDecade: '',
      directorSlug: 'paul-thomas-anderson',
      pages: 1, // director pages are fixed to 1
    });

    expect(readlineSync.question).toHaveBeenCalledTimes(2); // no pagination prompt
  });
});
