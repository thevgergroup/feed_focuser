/**
 * Classifier unit tests.
 *
 * Builds minimal DOM elements that resemble LinkedIn feed cards and verifies
 * the classifier scores and categories them correctly.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { loadContentScript } from './helpers/browser-env.js';

let classifier, DEFAULT_CONFIG;

beforeAll(() => {
  ({ classifier, DEFAULT_CONFIG } = loadContentScript());
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

function organicButtons() {
  return '<button>Like</button><button>Comment</button><button>Repost</button>';
}

// ---------------------------------------------------------------------------
// Definitive label detection
// ---------------------------------------------------------------------------

describe('classifier — definitive labels', () => {
  it('scores 1.0 for a standalone "Promoted" badge', () => {
    const el = makeCard(`
      <div>
        <span>Acme Corp</span>
        <span>Promoted</span>
        <p>Buy our product today!</p>
        <a href="https://example.com">Visit us</a>
      </div>
    `);
    const { score, category } = classifier.score(el, DEFAULT_CONFIG);
    expect(score).toBe(1.0);
    expect(category).toBe('ads');
  });

  it('scores 1.0 for "Sponsored" badge', () => {
    const el = makeCard(`<div><span>Sponsored</span><p>Ad content here</p><a href="#">click</a></div>`);
    const { score } = classifier.score(el, DEFAULT_CONFIG);
    expect(score).toBe(1.0);
  });

  it('scores 1.0 for "Promoted by Designli" (influencer ad pattern)', () => {
    const el = makeCard(`
      <div>
        <span>Keith Shields</span>
        <span>Promoted by Designli</span>
        <p>Most SaaS founders I talk to are scared to raise prices.</p>
        ${organicButtons()}
      </div>
    `);
    const { score, category } = classifier.score(el, DEFAULT_CONFIG);
    expect(score).toBe(1.0);
    expect(category).toBe('ads');
  });

  it('scores 1.0 for "Promoted · Partnership with X" (compound badge pattern)', () => {
    const el = makeCard(`
      <div>
        <span>Hans Dekker · 2nd</span>
        <span>GTM Architect | hansdekker.ai</span>
        <span>Promoted · Partnership with Instantly.ai</span>
        <p>Instantly.ai just dropped two features that actually change how outbound works.</p>
        ${organicButtons()}
      </div>
    `);
    const { score, category } = classifier.score(el, DEFAULT_CONFIG);
    expect(score).toBe(1.0);
    expect(category).toBe('ads');
  });

  it('scores 1.0 for "Recommended for you" label', () => {
    const el = makeCard(`
      <div>
        <span>Recommended for you</span>
        <span>Rakesh Gohel · 2nd</span>
        <p>Scaling with AI Agents...</p>
        ${organicButtons()}
      </div>
    `);
    const { score, category } = classifier.score(el, DEFAULT_CONFIG);
    expect(score).toBe(1.0);
    expect(category).toBe('suggested');
  });

  it('does not trigger on "promoted" inside long body text', () => {
    const el = makeCard(`
      <div>
        <span>Jane Smith · 1st</span>
        <p>I'm excited to share that I was recently promoted to VP of Engineering after 3 great years at this company.</p>
        ${organicButtons()}
        <span>2d</span>
      </div>
    `);
    const { score } = classifier.score(el, DEFAULT_CONFIG);
    // Should be low — "promoted" in prose, has organic signals
    expect(score).toBeLessThan(0.75);
  });
});

// ---------------------------------------------------------------------------
// Organic posts should score low
// ---------------------------------------------------------------------------

describe('classifier — organic posts', () => {
  it('scores low for a 1st-degree organic post with timestamp and reactions', () => {
    const el = makeCard(`
      <div>
        <a href="/in/alice">Alice Johnson · 1st</a>
        <span>Software Engineer at Acme</span>
        <span>3h</span>
        <p>Just shipped our new feature! Really proud of what the team accomplished this quarter. Here is what we learned building at scale...</p>
        ${organicButtons()}
      </div>
    `);
    const { score } = classifier.score(el, DEFAULT_CONFIG);
    expect(score).toBeLessThan(0.5);
  });

  it('scores low for a 2nd-degree post with timestamp', () => {
    const el = makeCard(`
      <div>
        <a href="/in/bob">Bob Lee · 2nd</a>
        <span>CTO at StartupCo</span>
        <span>1d</span>
        <p>Some thoughts on distributed systems and how we scaled our infrastructure last year...</p>
        ${organicButtons()}
      </div>
    `);
    const { score } = classifier.score(el, DEFAULT_CONFIG);
    expect(score).toBeLessThan(0.75);
  });
});

// ---------------------------------------------------------------------------
// Promo term scoring
// ---------------------------------------------------------------------------

describe('classifier — promo signals', () => {
  it('scores high for "People you may know" module', () => {
    const el = makeCard(`
      <div>
        <span>People you may know</span>
        <ul>
          <li><button>Follow</button> Carol Chen · 3rd+</li>
          <li><button>Follow</button> Dave Park · 3rd+</li>
          <li><button>Follow</button> Eve Lin · 3rd+</li>
        </ul>
        <a href="#">See all</a>
      </div>
    `);
    const { score } = classifier.score(el, { ...DEFAULT_CONFIG, hideSuggested: true });
    expect(score).toBeGreaterThanOrEqual(0.75);
  });

  it('scores high for a company post with follower count and no organic actions', () => {
    const el = makeCard(`
      <div>
        <a href="/company/acme">Acme Corp</a>
        <span>45,230 followers</span>
        <span>Promoted</span>
        <p>Check out our latest enterprise solution.</p>
        <a href="https://acme.example.com">Learn more</a>
      </div>
    `);
    const { score } = classifier.score(el, DEFAULT_CONFIG);
    expect(score).toBeGreaterThanOrEqual(0.75);
  });
});

// ---------------------------------------------------------------------------
// Connection degree config interaction
// ---------------------------------------------------------------------------

describe('classifier — connection degree config', () => {
  it('respects hidePromotedConnections=true for promoted 2nd-degree post', () => {
    const el = makeCard(`
      <div>
        <span>Promoted</span>
        <span>Hans Dekker · 2nd</span>
        <p>Check out our software.</p>
        <a href="https://external.com">Visit</a>
      </div>
    `);
    const { score } = classifier.score(el, { ...DEFAULT_CONFIG, hidePromotedConnections: true });
    expect(score).toBe(1.0);
  });

  it('falls through to normal scoring when hidePromotedConnections=false', () => {
    const el = makeCard(`
      <div>
        <span>Promoted</span>
        <span>Hans Dekker · 2nd</span>
        <p>Check out our software.</p>
        ${organicButtons()}
        <span>2h</span>
      </div>
    `);
    const { score } = classifier.score(el, { ...DEFAULT_CONFIG, hidePromotedConnections: false });
    // Falls through — 2nd-degree organic discount applies
    expect(score).toBeLessThan(1.0);
  });
});
