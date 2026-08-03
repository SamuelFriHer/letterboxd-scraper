import { ArrayUtils } from '../../src/utils/ArrayUtils';

describe('ArrayUtils', () => {
  describe('chunk', () => {
    it('should split an array into equal sized chunks', () => {
      const items: number[] = [1, 2, 3, 4, 5, 6];
      const result: number[][] = ArrayUtils.chunk(items, 2);
      expect(result).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
      ]);
    });

    it('should handle last chunk with fewer elements than batch size', () => {
      const items: number[] = [1, 2, 3, 4, 5];
      const result: number[][] = ArrayUtils.chunk(items, 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should return empty array when input array is empty', () => {
      const result: number[][] = ArrayUtils.chunk([], 3);
      expect(result).toEqual([]);
    });

    it('should return single chunk when size is greater than array length', () => {
      const items: string[] = ['a', 'b'];
      const result: string[][] = ArrayUtils.chunk(items, 5);
      expect(result).toEqual([['a', 'b']]);
    });

    it('should return empty array when size is zero or negative', () => {
      expect(ArrayUtils.chunk([1, 2, 3], 0)).toEqual([]);
      expect(ArrayUtils.chunk([1, 2, 3], -1)).toEqual([]);
    });
  });
});
