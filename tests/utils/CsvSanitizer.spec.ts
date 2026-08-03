import { CsvSanitizer } from '../../src/utils/CsvSanitizer';

describe('CsvSanitizer', () => {
  it('should return empty or falsy inputs untouched', () => {
    expect(CsvSanitizer.sanitizeField('')).toBe('');
  });

  it('should return normal text without modification', () => {
    expect(CsvSanitizer.sanitizeField('Inception')).toBe('Inception');
  });

  it.each(['=1+1', '+SUM(A1:A2)', '-10', '@SUM', '\tTabbed', '\rCarriage'])(
    'should prepend a single quote to dangerous prefix %s',
    (input: string) => {
      expect(CsvSanitizer.sanitizeField(input)).toBe(`'${input}`);
    }
  );

  it('should sanitize input with leading spaces preceding formula characters', () => {
    expect(CsvSanitizer.sanitizeField('   =cmd|/c calc.exe!A0')).toBe(
      "'   =cmd|/c calc.exe!A0"
    );
  });
});
