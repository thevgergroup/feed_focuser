/**
 * Keyword filter unit tests.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { loadContentScript } from './helpers/browser-env.js';

let matchesKeyword;

beforeAll(() => {
  ({ matchesKeyword } = loadContentScript());
});

function makeCard(text) {
  const el = document.createElement('div');
  el.textContent = text;
  return el;
}

describe('matchesKeyword', () => {
  it('returns null when keyword list is empty', () => {
    const el = makeCard('AI is taking over everything');
    expect(matchesKeyword(el, [])).toBeNull();
  });

  it('returns null when no keywords match', () => {
    const el = makeCard('A great post about distributed systems');
    expect(matchesKeyword(el, ['AI', 'crypto'])).toBeNull();
  });

  it('returns matched keyword (case-insensitive)', () => {
    const el = makeCard('This is all about AI and machine learning hype');
    expect(matchesKeyword(el, ['AI'])).toBe('ai');
  });

  it('matches multi-word keyword', () => {
    const el = makeCard('We are hiring! Come join our team at OpenAI today.');
    expect(matchesKeyword(el, ['come join'])).toBe('come join');
  });

  it('returns first matching keyword when multiple match', () => {
    const el = makeCard('crypto and AI and NFTs everywhere');
    const result = matchesKeyword(el, ['crypto', 'AI', 'NFT']);
    expect(['crypto', 'ai', 'nft']).toContain(result);
  });

  it('ignores whitespace-only keyword entries', () => {
    const el = makeCard('some normal post content');
    expect(matchesKeyword(el, ['  ', ''])).toBeNull();
  });
});
