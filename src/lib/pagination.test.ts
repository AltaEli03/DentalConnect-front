import { describe, expect, it } from 'vitest';
import { getPageItems } from './pagination';

describe('getPageItems', () => {
  it('shows every page when there are seven or fewer', () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('opens with a five-page window near the start', () => {
    expect(getPageItems(1, 17)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 17]);
  });

  it('centers the window in the middle', () => {
    expect(getPageItems(9, 17)).toEqual([1, 'ellipsis', 8, 9, 10, 'ellipsis', 17]);
  });

  it('closes with a five-page window near the end', () => {
    expect(getPageItems(17, 17)).toEqual([1, 'ellipsis', 13, 14, 15, 16, 17]);
  });
});
