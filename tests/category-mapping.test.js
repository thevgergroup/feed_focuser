/**
 * categoryToConfigKey unit tests.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { loadContentScript } from './helpers/browser-env.js';

let categoryToConfigKey;

beforeAll(() => {
  ({ categoryToConfigKey } = loadContentScript());
});

describe('categoryToConfigKey', () => {
  it('maps ads → hideAds', () => expect(categoryToConfigKey('ads')).toBe('hideAds'));
  it('maps suggested → hideSuggested', () => expect(categoryToConfigKey('suggested')).toBe('hideSuggested'));
  it('maps news → hideNews', () => expect(categoryToConfigKey('news')).toBe('hideNews'));
  it('maps promoted → hidePromoted', () => expect(categoryToConfigKey('promoted')).toBe('hidePromoted'));
  it('maps pagePosts → hidePagePosts', () => expect(categoryToConfigKey('pagePosts')).toBe('hidePagePosts'));
  it('falls back to hideSuggested for unknown category', () => expect(categoryToConfigKey('unknown')).toBe('hideSuggested'));
  it('falls back for null', () => expect(categoryToConfigKey(null)).toBe('hideSuggested'));
});
