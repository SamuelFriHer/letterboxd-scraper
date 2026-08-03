/**
 * Utility class to prevent CSV Formula Injection vulnerabilities.
 */
export class CsvSanitizer {
  /**
   * Sanitizes a string value by prepending a single quote if it begins with
   * potential formula execution triggers (=, +, -, @, \t, \r).
   *
   * @param fieldValue The raw field content to sanitize.
   * @returns The sanitized field string.
   */
  public static sanitizeField(fieldValue: string): string {
    if (!fieldValue) {
      return fieldValue;
    }
    if (/^[\s]*[=+\-@\t\r]/.test(fieldValue)) {
      return `'${fieldValue}`;
    }
    return fieldValue;
  }
}
