/**
 * Utility class providing generic array operations.
 */
export class ArrayUtils {
  /**
   * Splits an array of elements into consecutive batches of a specified size.
   *
   * @template T The type of elements in the array.
   * @param array The collection to be portioned.
   * @param size The maximum integer magnitude for each output batch.
   * @returns A matrix consisting of sequential batches.
   */
  public static chunk<T>(array: T[], size: number): T[][] {
    if (size <= 0) {
      return [];
    }
    const result: T[][] = [];
    for (let i: number = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }
}
