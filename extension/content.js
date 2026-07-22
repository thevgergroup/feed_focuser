/**
 * LinkedIn Feed Focuser — content.js
 *
 * Heuristic feed classifier. No hardcoded CSS selectors for LinkedIn's
 * internal structure — all feed/item detection is signal-based so it
 * survives DOM churn.
 */

// Chrome/Firefox compatibility shim
const browser = typeof chrome !== 'undefined' ? chrome : globalThis.browser;

// ---------------------------------------------------------------------------
// 1. Configuration
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  hideAds: true,
  hideSuggested: true,
  hideNews: true,
  hidePromoted: true,
  hidePromotedConnections: true, // hide promoted/sponsored posts even from 2nd/3rd connections
  hidePagePosts: true,           // hide company/brand page posts pushed into feed
  hideSidebarAds: true,          // hide promoted ads in the right-rail sidebar
  hide2ndDegree: false,          // treat 2nd-degree connection posts as organic (keep them)
  hide3rdDegree: true,           // hide posts from 3rd+ degree connections (weaker organic signal)
  hiddenKeywords: [],            // user-defined topic keywords — posts matching any are hidden
  collapseMode: true,            // true = accordion strip (default), false = hide completely
  sortByRecent: true,            // always switch feed sort to "Recent" instead of "Top"
  debugOverlay: false,
  threshold: 0.75,        // score >= threshold → filter
  collapseThreshold: 0.50 // score >= collapseThreshold → collapse (unused when collapseMode=false)
};

async function loadConfig() {
  const syncConfig = await new Promise((resolve) => {
    try {
      browser.storage.sync.get(DEFAULT_CONFIG, (result) => {
        resolve({ ...DEFAULT_CONFIG, ...result });
      });
    } catch {
      resolve({ ...DEFAULT_CONFIG });
    }
  });

  // Merge in learned labels from local storage so classifier can use them
  const localData = await new Promise((resolve) => {
    try {
      browser.storage.local.get({ learnedLabels: {} }, resolve);
    } catch {
      resolve({ learnedLabels: {} });
    }
  });

  return { ...syncConfig, learnedLabels: localData.learnedLabels || {} };
}

// ---------------------------------------------------------------------------
// 2. feedDetector — find the main feed column without class names
// ---------------------------------------------------------------------------

const feedDetector = {
  /**
   * Shallow structural fingerprint of a direct child element.
   * Used to measure sibling similarity — feed cards share the same fingerprint.
   */
  _domSignature(el) {
    const tag = el.tagName?.toLowerCase() || '';
    const role = el.getAttribute?.('role') || '';
    const childTags = [...(el.children || [])].slice(0, 4).map(c => c.tagName?.toLowerCase()).join(',');
    return `${tag}[${role}]{${childTags}}`;
  },

  /**
   * Repetition score: fraction of direct children that share the most common
   * structural fingerprint. Feed columns score high (many similar post cards);
   * wrappers score low (heterogeneous children: feed + sidebar + header).
   * Returns 0–1.
   */
  _repetitionScore(el) {
    const children = [...el.children];
    if (children.length < 2) return 0;
    const counts = new Map();
    for (const child of children) {
      const sig = this._domSignature(child);
      counts.set(sig, (counts.get(sig) || 0) + 1);
    }
    return Math.max(...counts.values()) / children.length;
  },

  /**
   * Content ownership ratio: how much of the element's own text lives directly
   * in its children (not grandchildren). A feed column's direct children ARE
   * the posts — so this ratio is high. A root wrapper's direct children are
   * layout containers (feed col, sidebar, nav) whose text is actually deeper —
   * so the ratio is low relative to total subtree text.
   *
   * Concretely: sum text length of direct children / total subtree text length.
   * The feed column is the deepest node where this ratio is still high AND the
   * child count is meaningful — its parent (the layout wrapper) has lower ratio
   * because some of its children are sidebars with much less text.
   */
  _ownershipRatio(el) {
    try {
      const total = (el.innerText || '').length;
      if (total === 0) return 0;
      const childrenText = [...el.children]
        .reduce((sum, c) => sum + (c.innerText || '').length, 0);
      // childrenText ≈ total for a flat container (the feed).
      // childrenText < total for a deep wrapper (text lives in grandchildren).
      // We want nodes where children account for most of the text AND children
      // count is reasonable — multiply by child count so we prefer denser nodes.
      return (childrenText / total) * Math.min(el.children.length, 20);
    } catch {
      return 0;
    }
  },

  find() {
    try {
      const scored = [];

      for (const el of document.querySelectorAll('div, section, ul, ol, main')) {
        try {
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          if (style.position === 'fixed' || style.position === 'sticky') continue;
          if (el.children.length < 3) continue;

          // The feed wins on both axes:
          //   repetition  — its children are structurally similar post cards
          //   ownership   — its children directly hold the page's bulk content
          // Wrappers (body, main, layout divs) fail on repetition because they
          // have heterogeneous children (feed col + sidebar + nav).
          // Sidebars fail on ownership because they're narrow with little text.
          const score = this._repetitionScore(el) * this._ownershipRatio(el);
          if (score > 0) scored.push({ el, score });
        } catch {
          // skip unpredictable elements
        }
      }

      if (scored.length === 0) return document.body;

      scored.sort((a, b) => b.score - a.score);
      return scored[0].el;
    } catch {
      return document.body;
    }
  }
};

// ---------------------------------------------------------------------------
// 3. itemDetector — find repeating feed cards within the feed container
// ---------------------------------------------------------------------------

const itemDetector = {
  // Patterns that identify chrome/UI elements that appear in the feed column
  // but are not feed posts — composer box, sort controls, "see more" buttons.
  _isUIChrome(el) {
    const text = (el.innerText || '').trim().toLowerCase();
    // Composer box: short text that's just action prompts, no author content
    if (/^(start a post|photo|video|write article)/.test(text)) return true;
    // Sort controls
    if (/^sort by/.test(text)) return true;
    // "Join the conversation" / empty state prompts
    if (text.length < 30 && /join|follow|connect/.test(text)) return true;
    return false;
  },

  find(feedEl) {
    try {
      const feedText = (feedEl.innerText || '').length;
      if (feedText === 0) return [];

      // LinkedIn's feed is a flat list — direct children are the cards.
      const directChildren = [...feedEl.children].filter(el => {
        try {
          const text = (el.innerText || '').trim();
          if (text.length < 15) return false;
          if (!el.querySelector('a, button')) return false;
          if (this._isUIChrome(el)) return false;
          const share = text.length / feedText;
          return share > 0.01 && share < 0.8;
        } catch {
          return false;
        }
      });

      if (directChildren.length >= 2) return directChildren;

      // Fallback: one wrapper child deep
      const deeper = [...feedEl.querySelectorAll(':scope > * > *')].filter(el => {
        try {
          const text = (el.innerText || '').trim();
          if (text.length < 15) return false;
          if (!el.querySelector('a, button')) return false;
          if (this._isUIChrome(el)) return false;
          const share = text.length / feedText;
          return share > 0.01 && share < 0.8;
        } catch {
          return false;
        }
      });

      return deeper.filter(el => !deeper.some(other => other !== el && other.contains(el)));
    } catch {
      return [];
    }
  }
};

// ---------------------------------------------------------------------------
// 4. textExtractor — pull ALL text signals, not just visible text
// ---------------------------------------------------------------------------

const textExtractor = {
  extract(el) {
    try {
      const parts = [];
      parts.push(el.innerText || '');
      parts.push(el.textContent || '');

      // Attributes that LinkedIn often uses to embed UI labels
      const attrSelectors = [
        '[aria-label]', '[title]', '[alt]',
        '[data-test-id]', '[data-control-name]',
        '[data-tracking-control-name]', '[data-entity-type]',
        '[data-view-name]', '[data-ad-banner]'
      ];

      for (const sel of attrSelectors) {
        try {
          for (const node of el.querySelectorAll(sel)) {
            parts.push(node.getAttribute('aria-label') || '');
            parts.push(node.getAttribute('title') || '');
            parts.push(node.getAttribute('alt') || '');
            // data-* attributes
            for (const attr of node.attributes) {
              if (attr.name.startsWith('data-')) {
                parts.push(attr.value);
              }
            }
          }
        } catch {
          // individual selector failures are non-fatal
        }
      }

      return parts.join(' ').toLowerCase().replace(/\s+/g, ' ');
    } catch {
      return '';
    }
  }
};

// ---------------------------------------------------------------------------
// 5. classifier — score each item 0–1 for "should be hidden"
// ---------------------------------------------------------------------------

const classifier = {
  // Promo phrase signals — must be specific phrases, not single words that
  // appear in normal post text. "follow" alone matches too much; "people you
  // may know" is unambiguous.
  _PROMO_TERMS: [
    // English — phrases only, no standalone common words
    'promoted', 'sponsored', 'promoted by',
    'recommended for you', 'people you may know', 'try premium',
    'linkedin news', 'boost your profile', 'you might like',
    'based on your profile', 'because you follow', 'because you viewed',
    'unlock premium', 'newsletter you may like',
    'pages you may like', 'groups you may like', 'jobs recommended for you',
    'people also viewed', 'more suggestions', 'suggested for you',
    'follow suggestions', 'suggested pages', 'suggested groups',
    'follow this page', 'follows this page', 'follow this newsletter',
    // Spanish
    'patrocinado', 'recomendado para ti', 'personas que quizás conozcas',
    // French
    'sponsorisé', 'recommandé pour vous',
    // German
    'gesponsert', 'empfohlen für sie', 'kennen sie vielleicht',
    // Italian
    'sponsorizzato', 'consigliato per te',
    // Portuguese
    'patrocinado', 'recomendado para você',
    // Dutch
    'gesponsord', 'aanbevolen voor u'
  ],

  // LinkedIn shows follower counts on Page posts (not personal profiles).
  // "1,704,909 followers" is a strong signal it's a company/brand post.
  _FOLLOWER_COUNT: /[\d,]+\s+followers?\b/i,

  // CTA button text — only fire when Follow/Subscribe appears as a standalone
  // primary button WITHOUT the organic Like/Comment/Share buttons present.
  // We check this contextually in score() rather than just matching button text.
  _STANDALONE_CTA: /^(follow|subscribe|join now|try for free|get started|view all jobs|apply now)$/i,

  // Organic post actions — presence lowers the hide score
  _ORGANIC_ACTIONS: /\b(like|comment|repost|share|send)\b/i,

  // Timestamp patterns common on organic posts
  _TIMESTAMP: /\b\d+\s*(s|m|h|d|w|mo)\b|\bjust now\b|\b\d+\s*(second|minute|hour|day|week|month)s?\s*ago\b/i,

  // Connection degree badges — strong organic signal
  _CONNECTION_DEGREE: /\b(1st|2nd|3rd)\b/,

  /**
   * Check if the element contains a short standalone label matching the pattern.
   * We look at leaf-level text nodes and short elements to avoid false matches
   * where "promoted" appears inside long prose text.
   */
  _hasLabel(el, pattern) {
    const nodes = [...el.querySelectorAll('span, div, p, li, a, strong, em, small')];
    for (const node of nodes) {
      const directText = [...node.childNodes]
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent.trim())
        .join(' ')
        .trim();
      if (directText && directText.length < 80 && pattern.test(directText)) return true;

      const full = (node.innerText || '').trim();
      if (full.length < 80 && pattern.test(full)) return true;
    }
    return false;
  },

  /**
   * Return the first short contextual label at the top of a feed card, or null.
   *
   * LinkedIn places labels like "Promoted", "From your activity",
   * "Because you follow X", "Recommended for you" as small text nodes near
   * the very top of the card — before the author block. Rather than matching
   * specific strings (whack-a-mole), we grab whatever text appears there and
   * treat its presence as a non-organic signal. The label text is returned so
   * it can be shown in the strip.
   *
   * We skip anything that looks like a connection degree badge, timestamp,
   * or author name (long text), since those also appear near the top.
   */
  _getCardContextLabel(el) {
    const _SKIP_RE = [
      /\b(1st|2nd|3rd)\b/,                          // degree badges
      /\b\d+\s*(s|m|h|d|w|mo)\b|\bjust now\b/i,     // timestamps
      /^https?:\/\//,                                 // URLs
      /^#\w+/,                                        // hashtags
      /^\d[\d,]*$/,                                   // bare numbers
    ];
    const _SKIP_EXACT = new Set([
      'sort by:', 'sort by', 'recent', 'top', 'new posts', 'feed post',
      'start a post', 'video', 'photo', 'write article',
    ]);

    // Contextual labels always contain at least one of these function words or
    // phrases. Job titles ("CTO at StartupCo"), company names, and person names
    // won't match. This is a vocabulary gate, not a string allowlist — any new
    // LinkedIn label variant that contains "your", "you", "for", "from",
    // "because", "activity", "follow", "suggested", "recommended", "promoted",
    // "sponsored", or "based on" will pass automatically.
    const _CONTEXT_VOCAB = /\b(your|you|for you|from|because|activity|follow|suggested|recommended|promoted|sponsored|based on|partnership|newsletter|trending)\b/i;

    // LinkedIn's contextual labels ("From your activity", "Promoted by X",
    // "Recommended for you") live in a header row that contains NO avatar
    // image — it's pure text/icon. Social proof rows ("Pedro celebrates this")
    // always have a person avatar <img> in the same subtree.
    //
    // Strategy: walk the direct children of the card. For each child, if it
    // contains an <img>, skip it entirely (social proof / author block).
    // Only extract text from image-free children near the top.
    for (const child of el.children) {
      if (child.classList.contains('lff-strip') || child.classList.contains('lff-card-content')) continue;
      if (child.querySelector('img')) continue; // social proof / author rows have avatars

      const walker = document.createTreeWalker(child, NodeFilter.SHOW_ELEMENT);
      let node = walker.nextNode();
      let visited = 0;
      while (node && visited < 20) {
        visited++;
        const direct = [...node.childNodes]
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent.trim())
          .filter(Boolean)
          .join(' ')
          .trim();
        if (direct.length > 2 && direct.length < 60) {
          if (!_SKIP_RE.some(re => re.test(direct)) && !_SKIP_EXACT.has(direct.toLowerCase())
              && _CONTEXT_VOCAB.test(direct)) {
            return direct;
          }
        }
        node = walker.nextNode();
      }
    }
    return null;
  },

  score(el, config) {
    try {
      const text = textExtractor.extract(el);
      let score = 0;
      const reasons = [];

      const add = (amount, reason) => {
        score += amount;
        if (reason) reasons.push(reason);
      };

      // --- High-confidence label check ---
      // If LinkedIn's own "Promoted" or "Sponsored" badge appears as a short
      // standalone label, that's definitive — skip organic signal discounts.
      // "Promoted by X" is LinkedIn's influencer/paid ad label — match both
      // the standalone badge ("Promoted") and the "Promoted by <brand>" variant.
      const hasDefinitiveLabel = this._hasLabel(el, /^(promoted|sponsored|promoted by .+|promoted\s*[·•]\s*.+|patrocinado|sponsorisé|gesponsert|sponsorizzato|gesponsord)$/i);
      if (hasDefinitiveLabel) {
        const hasConnection = this._CONNECTION_DEGREE.test(text);
        // Even 2nd/3rd degree connections can have promoted posts
        if (!hasConnection || config.hidePromotedConnections) {
          labelLearner.observe(el);
          return {
            score: 1.0,
            reasons: ['definitive "Promoted"/"Sponsored" label detected'],
            category: 'ads'
          };
        }
        // Connection found but user wants to keep promoted-connection posts
        // Fall through to normal scoring but note it
        add(0.5, 'has Promoted label (connection degree present, user setting: keep)');
      }

      // Positional top-of-card contextual label — LinkedIn places suggestion
      // labels ("Recommended for you", "From your activity", "Because you
      // follow X", etc.) as short text before the author block. We grab
      // whatever is there rather than matching specific strings, so new label
      // variants are caught automatically without code changes.
      const cardContextLabel = this._getCardContextLabel(el);
      if (cardContextLabel && config.hideSuggested) {
        // Only treat as definitive if it doesn't look like a Promoted/Sponsored
        // label (those are already handled above) and there's no connection
        // degree signal co-present (a 1st-degree connection's post might have
        // a short company name near the top).
        const isAlreadyHandled = /^(promoted|sponsored)/i.test(cardContextLabel);
        // Only skip if a 1st-degree connection is present — a genuine friend's
        // post might have a short company name near the top that looks like a
        // label. 2nd/3rd-degree presence in a "Recommended for you" card is
        // normal and doesn't make it organic.
        const has1stDegree = /\b1st\b/.test(text);
        if (!isAlreadyHandled && !has1stDegree) {
          labelLearner.observe(el);
          return {
            score: 1.0,
            reasons: [`contextual label at top of card: "${cardContextLabel}"`],
            category: 'suggested'
          };
        }
      }

      // Check learned labels — user-confirmed signals from prior sessions
      if (config.learnedLabels) {
        for (const [label, meta] of Object.entries(config.learnedLabels)) {
          if (!meta.enabled || meta.count < labelLearner.THRESHOLD) continue;
          if (this._hasLabel(el, new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'))) {
            return {
              score: 1.0,
              reasons: [`learned label: "${label}" (seen on ${meta.count} ad cards)`],
              category: 'ads'
            };
          }
        }
      }

      // --- Promo signals ---

      // Check each promo term (cap total contribution to avoid runaway scores)
      let promoTermHits = 0;
      const foundPromoTerms = [];
      for (const term of this._PROMO_TERMS) {
        if (text.includes(term)) {
          promoTermHits++;
          foundPromoTerms.push(term);
        }
      }
      if (promoTermHits > 0) {
        // +0.3 per unique hit, capped at +0.6 total from text terms
        const termScore = Math.min(0.6, promoTermHits * 0.3);
        add(termScore, `promo text: ${foundPromoTerms.slice(0, 3).join(', ')}`);
      }

      // Has a standalone Follow/Subscribe CTA — but only counts if there are
      // no organic Like/Comment/Share buttons present. On a real post the
      // author's "Follow" button coexists with Like/Comment; on a suggested-
      // page card it's the only action.
      const buttons = [...el.querySelectorAll('button, a[href]')];
      const buttonTexts = buttons.map(b => (b.innerText || b.getAttribute('aria-label') || '').trim().toLowerCase());
      const hasOrganicButtons = buttonTexts.some(t => this._ORGANIC_ACTIONS.test(t));
      const hasStandaloneCTA = !hasOrganicButtons && buttonTexts.some(t => this._STANDALONE_CTA.test(t));
      if (hasStandaloneCTA) {
        add(0.2, 'has standalone CTA button (no organic actions present)');
      }

      // External link (not linkedin.com) — common in ads
      const hasExternalLink = buttons.some(b => {
        try {
          const href = b.getAttribute('href') || b.href || '';
          if (!href || href.startsWith('#') || href.startsWith('javascript')) return false;
          const url = new URL(href, location.href);
          return !url.hostname.includes('linkedin.com');
        } catch {
          return false;
        }
      });
      if (hasExternalLink) {
        add(0.15, 'has external link');
      }

      // No profile image/avatar — promoted cards often lack the poster's photo.
      // Use attribute signals rather than pixel sizes — works at any viewport/zoom.
      const hasAvatar = !!(
        el.querySelector('img[src*="profile"], img[alt*="photo"], img[alt*="Photo"]') ||
        el.querySelector('[data-ghost-class="ghost-person"]') ||
        // Any img whose natural aspect ratio is square-ish (avatar) and whose
        // rendered size is smaller than its parent (not a hero/banner image)
        [...el.querySelectorAll('img')].some(img => {
          try {
            const ir = img.getBoundingClientRect();
            const pr = img.parentElement?.getBoundingClientRect();
            if (!ir.width || !pr?.width) return false;
            const isSquarish = Math.abs(ir.width - ir.height) / Math.max(ir.width, ir.height) < 0.3;
            const isSmallerThanParent = ir.width < pr.width * 0.5;
            return isSquarish && isSmallerThanParent;
          } catch { return false; }
        })
      );
      if (!hasAvatar) {
        add(0.1, 'no profile avatar found');
      }

      // "See all" / "View all" links — common in recommendation modules
      if (/\b(see all|view all|show all|more results)\b/i.test(text)) {
        add(0.1, 'has "see all / view all" link');
      }

      // Page/company post with follower count — personal profiles don't show this.
      if (this._FOLLOWER_COUNT.test(text)) {
        add(0.15, 'has follower count (company/page post, not personal)');
      }

      // Multiple standalone Follow buttons = "People you may know" / suggestion module.
      const followButtons = buttonTexts.filter(t => /^\+?\s*follow$/i.test(t));
      if (followButtons.length >= 2) {
        add(0.35, `has ${followButtons.length} Follow buttons (suggestion module)`);
      }

      // Carousel of sub-cards: look for elements whose text share of the parent
      // is small and roughly equal — characteristic of person/job suggestion rows.
      // No pixel sizes — use content distribution instead.
      const subItems = [...el.querySelectorAll('li, article')].filter(c => {
        if (c === el) return false;
        try {
          const parentText = (el.innerText || '').length;
          const childText = (c.innerText || '').length;
          if (parentText === 0 || childText < 10) return false;
          const share = childText / parentText;
          // Each sub-item should be a small but non-trivial slice of the parent
          return share > 0.02 && share < 0.4;
        } catch { return false; }
      });
      if (subItems.length >= 3) {
        add(0.2, 'contains recommendation-card carousel layout');
      }

      // --- Organic signals (reduce score) ---

      // Connection degree badge: only treat as organic if user hasn't opted to
      // filter that degree. 1st-degree is always organic. 2nd/3rd depend on config.
      const has1st = /\b1st\b/.test(text);
      const has2nd = /\b2nd\b/.test(text);
      const has3rdPlus = /\b3rd\+?\b/.test(text);
      const degreeIsOrganic =
        has1st ||
        (has2nd && !config.hide2ndDegree) ||
        (has3rdPlus && !config.hide3rdDegree);
      if (degreeIsOrganic) {
        add(-0.25, 'has connection degree treated as organic');
      }

      // Organic reaction/comment/share buttons (reuse computed value from above)
      if (hasOrganicButtons) {
        add(-0.2, 'has organic post actions (Like/Comment/Share)');
      }

      // Timestamp — organic posts always have one
      if (this._TIMESTAMP.test(text)) {
        add(-0.15, 'has timestamp (organic post indicator)');
      }

      // No promo language at all
      if (promoTermHits === 0 && !hasDefinitiveLabel) {
        add(-0.1, 'no promo language detected');
      }

      const finalScore = Math.max(0, Math.min(1, score));
      const category = this._categorize(finalScore, text, config);

      return { score: finalScore, reasons, category };
    } catch {
      return { score: 0, reasons: ['classifier error'], category: null };
    }
  },

  _categorize(score, text, config) {
    if (score < config.threshold) return null;
    if (/\b(promoted|sponsored)\b/.test(text)) return 'ads';
    if (/\b(suggested|people you may know)\b/.test(text)) return 'suggested';
    if (/\b(linkedin news|trending)\b/.test(text)) return 'news';
    if (/follow this page|follows this page|followers/i.test(text)) return 'pagePosts';
    if (/\b(recommended for you|try premium|patrocinado|sponsorisé|gesponsert)\b/.test(text)) return 'promoted';
    return 'suggested'; // catch-all
  }
};

// ---------------------------------------------------------------------------
// 6. labelLearner — observes definitively-classified ad cards and builds a
//    frequency map of short text labels. Terms seen on enough distinct cards
//    are surfaced in the popup as user-toggleable signals.
// ---------------------------------------------------------------------------

const labelLearner = {
  // Minimum number of distinct ad cards a term must appear on before it's
  // surfaced in the popup. Low enough to catch real patterns quickly.
  THRESHOLD: 3,

  // Max character length for a text node to be considered a badge/label
  MAX_LABEL_LEN: 80,

  // Known organic / LinkedIn-chrome texts to ignore
  _IGNORE: new Set([
    'feed post', 'more', 'follow', 'like', 'comment', 'repost', 'share', 'send',
    'react', 'see more', 'see less', 'load more', 'show more comments',
    '• 1st', '• 2nd', '• 3rd', '• 3rd+',
    'likes this', 'celebrates this', 'supports this', 'loves this', 'finds this insightful',
    'start a post', 'video', 'photo', 'write article', 'sort by:', 'top', 'new posts',
    'connections', 'reactions', 'comments', 'reposts',
  ]),

  // Patterns that are definitively noise regardless of content
  _NOISE: [
    /^\d+\s*[smhdw]\s*[•·]?$/,          // timestamps: "9h •", "2d", "3d •"
    /^\d+\s*[smhdw]\s*[•·]/,            // "2d • something"
    /^[•·]\s*\d+[smhdw]/,               // "• 2d"
    /^\d+\s*\/\s*\d+$/,                 // "1 / 4" slide indicators
    /^\d+\s*(reaction|comment|repost)/i, // "29 reactions"
    /^https?:\/\//,                      // URLs
    /^lnkd\.in\//,                       // shortened LinkedIn URLs
    /^#\w+/,                             // hashtags
    /^\d[\d,]*\s*follower/i,             // "1,234 followers"
    /^\+?\s*follow$/i,                   // standalone follow button
    /\b(1st|2nd|3rd)\b/,                 // degree badges
    /^[\d,]+$/,                          // numbers with commas
    /^[•·]\s*(1st|2nd|3rd)/,            // "• 2nd"
  ],

  // Only terms that start with a known promotional vocabulary word are
  // candidates — this prevents person names and company names from being learned.
  _PROMO_VOCAB: /^(promoted|sponsored|recommended|suggested|from your|partnership|patrocinado|sponsorisé|gesponsert|sponsorizzato|gesponsord|aanbevolen|recommandé|empfohlen|consigliato|sugerido|de tu|de votre|dalla tua|van jouw)/i,

  // In-memory cache — mutations are synchronous so concurrent observe() calls
  // always see each other's writes before the async save flushes.
  _cache: null,
  _loadPromise: null, // single in-flight load so concurrent callers share it
  _saveTimer: null,

  _isValidLabel(label) {
    return (
      typeof label === 'string' &&
      label.length > 2 &&
      label.length <= this.MAX_LABEL_LEN &&
      !this._IGNORE.has(label) &&
      !this._NOISE.some(re => re.test(label)) &&
      this._PROMO_VOCAB.test(label)
    );
  },

  async _load() {
    if (this._cache) return this._cache;
    if (this._loadPromise) return this._loadPromise;
    this._loadPromise = new Promise((resolve) => {
      try {
        browser.storage.local.get({ learnedLabels: {} }, (result) => {
          const raw = result.learnedLabels || {};
          // Scrub any entry that no longer passes current filters — handles
          // stale data from earlier looser filter versions automatically.
          this._cache = Object.fromEntries(
            Object.entries(raw).filter(([label]) => this._isValidLabel(label))
          );
          this._loadPromise = null;
          resolve(this._cache);
        });
      } catch {
        this._cache = {};
        this._loadPromise = null;
        resolve(this._cache);
      }
    });
    return this._loadPromise;
  },

  _save() {
    // Debounced — batch rapid observe() calls into a single write
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      try {
        browser.storage.local.set({ learnedLabels: this._cache });
      } catch { /* non-fatal */ }
      this._saveTimer = null;
    }, 300);
  },

  // Extract short promotional label texts from the header region of a card.
  // We walk the DOM tree but cap at a depth of 6 levels and stop after visiting
  // the first 60 nodes — the badge is always near the top of the card structure,
  // and we don't want to scan the post body, reaction counts, or comments.
  _extractLabels(el) {
    const labels = new Set();
    // Use querySelectorAll — simpler and depth-agnostic.
    // LinkedIn nests badges ~11 levels deep so a recursive walk with depth cap misses them.
    const nodes = el.querySelectorAll('span, div, a, strong, p');
    let visited = 0;
    for (const node of nodes) {
      if (visited++ > 200) break;
      if (node.children.length > 3) continue;
      const directText = [...node.childNodes]
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent.trim())
        .join(' ').trim().toLowerCase();
      if (this._isValidLabel(directText)) {
        labels.add(directText);
      }
    }
    return labels;
  },

  // Call this when a card is definitively classified as an ad via structural
  // signals. We record which short text nodes appeared on it.
  async observe(el) {
    const store = await this._load();
    const labels = this._extractLabels(el);
    let changed = false;

    for (const label of labels) {
      if (!store[label]) {
        store[label] = { count: 0, enabled: true };
      }
      store[label].count += 1;
      changed = true;
    }

    if (changed) {
      this._save(); // debounced, sync cache mutation already happened above
      try {
        browser.runtime.sendMessage({ type: 'LABELS_UPDATED' }).catch(() => {});
      } catch { /* popup may not be open */ }
    }
  },

  // Returns labels that have crossed the threshold and are enabled by the user.
  async getActiveLabels() {
    const store = await this._load();
    return Object.entries(store)
      .filter(([, v]) => v.count >= this.THRESHOLD && v.enabled)
      .map(([label]) => label);
  },

  // Toggle a specific label on/off (called from popup via CONFIG_UPDATE).
  async setEnabled(label, enabled) {
    const store = await this._load();
    if (store[label]) {
      store[label].enabled = enabled;
      await this._save();
    }
  },

  // Remove a label entirely (user dismissed it).
  async remove(label) {
    const store = await this._load();
    delete store[label];
    await this._save();
  },
};

// ---------------------------------------------------------------------------
// 7. renderer — show/hide/collapse feed items
// ---------------------------------------------------------------------------

const renderer = {
  // Category labels for the accordion strip
  _CATEGORY_LABEL: {
    ads: 'Ad',
    suggested: 'Suggested',
    news: 'News',
    promoted: 'Promoted',
    pagePosts: 'Brand post',
    keyword: 'Keyword match',
    unknown: 'Filtered',
  },

  collapseItem(el, score, _reasons, category, fingerprint) {
    try {
      if (el.getAttribute('data-lff-collapsed') === 'true') return;
      el.setAttribute('data-lff-collapsed', 'true');
      el.setAttribute('data-lff-score', score.toFixed(2));
      el.setAttribute('data-lff-category', category || 'unknown');

      const label = this._CATEGORY_LABEL[category] || 'Filtered';
      const pct = Math.round(score * 100);

      // Wrap the card's existing content in a hidden container
      const wrapper = document.createElement('div');
      wrapper.className = 'lff-card-content';
      wrapper.style.cssText = 'display:none;';
      while (el.firstChild) wrapper.appendChild(el.firstChild);
      el.appendChild(wrapper);

      // Build the accordion strip
      const strip = document.createElement('div');
      strip.className = 'lff-strip';

      const labelSpan = document.createElement('span');
      labelSpan.className = `lff-strip-label lff-cat-${category || 'unknown'}`;
      labelSpan.textContent = label;

      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'lff-strip-score';
      scoreSpan.textContent = `${pct}% match`;

      // "Always show" — saves an allow override and restores the card in place
      // without requiring the user to open the popup.
      const allowBtn = document.createElement('button');
      allowBtn.className = 'lff-strip-allow';
      allowBtn.textContent = 'Always show';
      allowBtn.setAttribute('aria-label', 'Always show this post');
      allowBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (fingerprint) userLearning.setUserOverride(fingerprint, 'allow');
        while (wrapper.firstChild) el.insertBefore(wrapper.firstChild, strip);
        el.removeChild(wrapper);
        el.removeChild(strip);
        el.removeAttribute('data-lff-collapsed');
        el.removeAttribute('data-lff-score');
        el.removeAttribute('data-lff-category');
      });

      const btn = document.createElement('button');
      btn.className = 'lff-strip-btn';
      btn.setAttribute('aria-label', 'Show filtered post');
      btn.setAttribute('aria-expanded', 'false');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '14');
      svg.setAttribute('height', '14');
      svg.setAttribute('viewBox', '0 0 14 14');
      svg.setAttribute('fill', 'none');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M3 5l4 4 4-4');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '1.8');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);
      btn.appendChild(svg);

      strip.appendChild(labelSpan);
      strip.appendChild(scoreSpan);
      strip.appendChild(allowBtn);
      strip.appendChild(btn);

      let expanded = false;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        expanded = !expanded;
        wrapper.style.display = expanded ? '' : 'none';
        btn.setAttribute('aria-expanded', expanded);
        btn.style.transform = expanded ? 'rotate(180deg)' : '';
      });

      // Insert strip before wrapper so it stays at the top when expanded
      el.insertBefore(strip, wrapper);
    } catch {
      // Non-fatal
    }
  },

  hideItem(el, score, reasons, category) {
    try {
      el.setAttribute('data-lff-hidden', 'true');
      el.setAttribute('data-lff-score', score.toFixed(2));
      el.setAttribute('data-lff-category', category || 'unknown');
      el.setAttribute('data-lff-reasons', reasons.slice(0, 5).join(' | '));
      el.style.display = 'none';
    } catch {
      // Non-fatal: element may have been removed
    }
  },

  showDebugOverlay(el, score, reasons) {
    try {
      if (el.querySelector('.lff-debug-overlay')) return;

      const hue = Math.round((1 - score) * 120); // 0=red, 120=green
      const overlay = document.createElement('div');
      overlay.className = 'lff-debug-overlay';

      // Use position:fixed anchored to the element's current rect.
      // This sidesteps all ancestor positioning contexts — the badge always
      // appears at the card's top-right regardless of LinkedIn's DOM structure.
      // A scroll listener keeps it pinned as the user scrolls.
      const updatePosition = () => {
        try {
          const rect = el.getBoundingClientRect();
          // Hide if card is off-screen
          const visible = rect.bottom > 0 && rect.top < window.innerHeight;
          overlay.style.display = visible ? 'block' : 'none';
          if (visible) {
            overlay.style.top = `${Math.max(rect.top + 4, 4)}px`;
            overlay.style.right = `${window.innerWidth - rect.right + 4}px`;
          }
        } catch { /* non-fatal */ }
      };

      overlay.style.cssText = [
        'position:fixed', 'z-index:2147483646',
        `background:hsl(${hue},70%,40%)`, 'color:#fff',
        'font-size:11px', 'font-family:monospace', 'padding:4px 6px',
        'border-radius:4px', 'max-width:260px', 'pointer-events:none',
        'line-height:1.4', 'box-shadow:0 1px 4px rgba(0,0,0,0.4)'
      ].join(';');
      overlay.textContent = `LFF ${score.toFixed(2)} | ${reasons.slice(0, 3).join(' · ')}`;

      // Store cleanup reference on the overlay element so restoreAll can remove listener
      const onScroll = () => updatePosition();
      overlay._lffScrollHandler = onScroll;
      window.addEventListener('scroll', onScroll, { passive: true });

      document.body.appendChild(overlay);
      updatePosition();
    } catch {
      // Non-fatal
    }
  },

  restoreAll() {
    try {
      document.querySelectorAll('[data-lff-hidden="true"]').forEach(el => {
        el.style.display = '';
        el.removeAttribute('data-lff-hidden');
      });
      document.querySelectorAll('[data-lff-collapsed="true"]').forEach(el => {
        // Move content back out of wrapper, remove strip
        const wrapper = el.querySelector('.lff-card-content');
        const strip = el.querySelector('.lff-strip');
        if (wrapper) {
          while (wrapper.firstChild) el.insertBefore(wrapper.firstChild, wrapper);
          wrapper.remove();
        }
        if (strip) strip.remove();
        el.removeAttribute('data-lff-collapsed');
        el.removeAttribute('data-lff-score');
        el.removeAttribute('data-lff-category');
      });
      document.querySelectorAll('.lff-debug-overlay').forEach(el => {
        if (el._lffScrollHandler) window.removeEventListener('scroll', el._lffScrollHandler);
        el.remove();
      });
    } catch {
      // Non-fatal
    }
  }
};

// ---------------------------------------------------------------------------
// 7. userLearning — localStorage fingerprint-based user overrides
// ---------------------------------------------------------------------------

const userLearning = {
  _STORAGE_KEY: 'lff_user_overrides',

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this._STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  },

  _save(map) {
    try {
      localStorage.setItem(this._STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Storage might be full or blocked
    }
  },

  /**
   * Simple fingerprint: structural signature + first 50 chars of text.
   * Avoids timestamps so the fingerprint is stable across refreshes.
   */
  generateFingerprint(el) {
    try {
      const text = textExtractor.extract(el).slice(0, 50).replace(/\s+/g, ' ').trim();
      const tag = el.tagName?.toLowerCase() || 'div';
      const childCount = el.children.length;
      const buttonCount = el.querySelectorAll('button').length;
      return btoa(`${tag}:${childCount}:${buttonCount}:${text}`).slice(0, 32);
    } catch {
      return 'unknown';
    }
  },

  getUserOverride(fingerprint) {
    try {
      return this._load()[fingerprint] || null; // 'hide' | 'allow' | null
    } catch {
      return null;
    }
  },

  setUserOverride(fingerprint, decision) {
    try {
      const map = this._load();
      map[fingerprint] = decision;
      this._save(map);
    } catch {
      // Non-fatal
    }
  }
};

// ---------------------------------------------------------------------------
// 8. observer — MutationObserver + setInterval for scroll and SPA navigation
// ---------------------------------------------------------------------------

const observer = {
  _mo: null,
  _interval: null,
  _debounceTimer: null,
  _currentFeedEl: null,

  _debounce(fn, delay) {
    return (...args) => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => fn(...args), delay);
    };
  },

  _scan(processItem) {
    try {
      // Re-detect the feed each scan — LinkedIn can replace the container on scroll
      const feedEl = feedDetector.find();
      if (!feedEl) return;

      // If the feed container changed, re-attach the MutationObserver to it
      if (feedEl !== this._currentFeedEl) {
        if (this._mo) this._mo.disconnect();
        this._currentFeedEl = feedEl;
        if (this._mo) {
          this._mo.observe(feedEl, { childList: true, subtree: true });
        }
      }

      const items = itemDetector.find(feedEl);
      for (const item of items) {
        if (!processed.has(item)) processItem(item);
      }
    } catch {
      // Non-fatal
    }
  },

  start(feedEl, processItem) {
    // Always stop cleanly before starting to avoid stacked observers
    this.stop();
    if (!feedEl) return;

    this._currentFeedEl = feedEl;

    const debouncedScan = this._debounce(() => this._scan(processItem), 400);

    this._mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes.length === 0) continue;

        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // Direct child of feed — process it immediately (bypasses content-share filter)
          if (m.target === this._currentFeedEl) {
            if (!processed.has(node)) {
              setTimeout(() => { if (!processed.has(node)) processItem(node); }, 50);
            }
            continue;
          }

          // Node added deeper in the tree — find its nearest feed-direct-child ancestor.
          // If that ancestor hasn't been processed yet, fast-path it too.
          // This catches sidebar ads and cards that LinkedIn hydrates in stages.
          let ancestor = node.parentElement;
          while (ancestor && ancestor.parentElement !== this._currentFeedEl) {
            ancestor = ancestor.parentElement;
          }
          if (ancestor && !processed.has(ancestor)) {
            setTimeout(() => { if (!processed.has(ancestor)) processItem(ancestor); }, 100);
          }
        }

        // Full re-scan fallback
        debouncedScan();
      }
    });
    this._mo.observe(feedEl, { childList: true, subtree: true });

    // Interval fallback: catches feed container replacements and timing races
    this._interval = setInterval(() => this._scan(processItem), 2000);
  },

  stop() {
    if (this._mo) { this._mo.disconnect(); this._mo = null; }
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    clearTimeout(this._debounceTimer);
    this._currentFeedEl = null;
  }
};

// ---------------------------------------------------------------------------
// 9. Stats tracking
// ---------------------------------------------------------------------------

const stats = {
  _count: 0,

  increment() {
    this._count++;
    this._persist();
  },

  _persist() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      browser.storage.local.set({ hiddenToday: this._count, date: today });
    } catch {
      // Non-fatal
    }
  },

  async load() {
    return new Promise((resolve) => {
      try {
        browser.storage.local.get(['hiddenToday', 'date'], (result) => {
          const today = new Date().toISOString().slice(0, 10);
          // Reset if it's a new day
          this._count = (result.date === today) ? (result.hiddenToday || 0) : 0;
          resolve(this._count);
        });
      } catch {
        this._count = 0;
        resolve(0);
      }
    });
  },

  get count() { return this._count; }
};

// ---------------------------------------------------------------------------
// 10. Sort enforcer — keeps feed sorted by "Recent" instead of LinkedIn's
//     default "Top". LinkedIn resets to "Top" on every page load and SPA
//     navigation. We detect the sort button via its text content (not class
//     names) and programmatically click "Recent" whenever "Top" appears.
// ---------------------------------------------------------------------------

const sortEnforcer = {
  _mo: null,
  _pending: false,

  start() {
    this._enforce();
    if (this._mo) return;
    this._mo = new MutationObserver(() => {
      if (!this._pending) {
        this._pending = true;
        // Debounce — the DOM fires rapidly during feed hydration
        setTimeout(() => { this._pending = false; this._enforce(); }, 300);
      }
    });
    this._mo.observe(document.body, { childList: true, subtree: true });
  },

  stop() {
    if (this._mo) { this._mo.disconnect(); this._mo = null; }
  },

  restart() {
    this.stop();
    this.start();
  },

  _getSortButton() {
    return [...document.querySelectorAll('[role="button"]')]
      .find(el => el.innerText.trim().startsWith('Sort by:'));
  },

  async _enforce() {
    const btn = this._getSortButton();
    if (!btn) return;
    if (!btn.innerText.includes('Top')) return;

    // Open the dropdown
    btn.click();
    await new Promise(r => setTimeout(r, 300));

    // Find and click "Recent" menu item
    const recent = [...document.querySelectorAll('[role="menuitem"], [role="option"], [role="radio"]')]
      .find(el => el.innerText.trim() === 'Recent');
    if (recent) {
      recent.click();
    } else {
      // Fallback: close the dropdown if Recent wasn't found
      btn.click();
    }
  },
};

// ---------------------------------------------------------------------------
// 11. Main orchestration
// ---------------------------------------------------------------------------

let processed = new WeakSet();
let currentConfig = { ...DEFAULT_CONFIG };

function categoryToConfigKey(category) {
  const map = {
    ads: 'hideAds',
    suggested: 'hideSuggested',
    news: 'hideNews',
    promoted: 'hidePromoted',
    pagePosts: 'hidePagePosts'
  };
  return map[category] || 'hideSuggested';
}

function matchesKeyword(el, keywords) {
  if (!keywords || keywords.length === 0) return null;
  const text = (el.innerText || '').toLowerCase();
  for (const kw of keywords) {
    const term = kw.trim().toLowerCase();
    if (term && text.includes(term)) return term;
  }
  return null;
}

function processItem(el) {
  if (processed.has(el)) return;
  processed.add(el);

  try {
    // Keyword filter takes priority — explicit user intent, no scoring needed
    const matchedKeyword = matchesKeyword(el, currentConfig.hiddenKeywords);
    if (matchedKeyword) {
      const kwReasons = [`keyword match: "${matchedKeyword}"`];
      const kwFingerprint = userLearning.generateFingerprint(el);
      if (currentConfig.collapseMode) {
        renderer.collapseItem(el, 1.0, kwReasons, 'keyword', kwFingerprint);
      } else {
        renderer.hideItem(el, 1.0, kwReasons, 'keyword');
      }
      stats.increment();
      if (currentConfig.debugOverlay) {
        renderer.showDebugOverlay(el, 1.0, kwReasons);
      }
      return;
    }

    const { score, reasons, category } = classifier.score(el, currentConfig);
    const fingerprint = userLearning.generateFingerprint(el);
    const userOverride = userLearning.getUserOverride(fingerprint);

    if (userOverride === 'hide' || (score >= currentConfig.threshold && !userOverride)) {
      const configKey = categoryToConfigKey(category);
      if (userOverride === 'hide' || currentConfig[configKey]) {
        if (currentConfig.collapseMode) {
          renderer.collapseItem(el, score, reasons, category, fingerprint);
        } else {
          renderer.hideItem(el, score, reasons, category);
        }
        stats.increment();
      }
    } else if (!currentConfig.collapseMode && score >= currentConfig.collapseThreshold && userOverride !== 'allow') {
      // Intermediate collapse only relevant in hide mode
      renderer.hideItem(el, score, reasons, category);
    }

    if (currentConfig.debugOverlay) {
      renderer.showDebugOverlay(el, score, reasons);
    }
  } catch {
    // If classification fails for any item, continue with next
  }
}

let _initialized = false;

function injectStyles() {
  if (document.getElementById('lff-styles')) return;
  const style = document.createElement('style');
  style.id = 'lff-styles';
  style.textContent = `
    .lff-strip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin: 4px 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .lff-strip-label {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .lff-cat-ads        { background: #fee2e2; color: #b91c1c; }
    .lff-cat-suggested  { background: #e0f2fe; color: #0369a1; }
    .lff-cat-news       { background: #fef9c3; color: #854d0e; }
    .lff-cat-promoted   { background: #fce7f3; color: #9d174d; }
    .lff-cat-pagePosts  { background: #ede9fe; color: #5b21b6; }
    .lff-cat-keyword    { background: #dcfce7; color: #15803d; }
    .lff-cat-unknown    { background: #f1f5f9; color: #475569; }
    .lff-strip-score {
      font-size: 11px;
      color: #94a3b8;
      flex: 1;
    }
    .lff-strip-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 4px;
      color: #64748b;
      display: flex;
      align-items: center;
      border-radius: 4px;
      transition: background 0.15s, transform 0.2s;
      flex-shrink: 0;
    }
    .lff-strip-btn:hover { background: #e2e8f0; }
    .lff-strip-allow {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 6px;
      font-size: 11px;
      color: #0369a1;
      border-radius: 4px;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .lff-strip-allow:hover { background: #e0f2fe; text-decoration: underline; }
    .lff-card-content { overflow: hidden; }
  `;
  document.head.appendChild(style);
}

async function initialize() {
  try {
    currentConfig = await loadConfig();
    await stats.load();
    injectStyles();

    // LinkedIn is a SPA — the feed content renders well after document_idle.
    // Poll until we find feed items, up to 10 seconds.
    await waitForFeedAndProcess();
    sidebarAdRemover.start();
    if (currentConfig.sortByRecent) sortEnforcer.start();

    // Listen for config updates from the popup
    if (!_initialized) {
      _initialized = true;
      browser.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'CONFIG_UPDATE') {
          // Invalidate learned label cache so next load picks up toggle changes
          labelLearner._cache = null;
          currentConfig = { ...DEFAULT_CONFIG, ...msg.config };
          renderer.restoreAll();
          observer.stop();
          sidebarAdRemover.restart();
          if (currentConfig.sortByRecent) sortEnforcer.restart(); else sortEnforcer.stop();
          reprocess();
        } else if (msg.type === 'DIAGNOSE_TOGGLE') {
          diagnosticPanel.toggle();
        }
      });

      // Handle SPA navigation: LinkedIn pushes new history entries when you
      // navigate between sections. Re-scan whenever the URL changes to /feed.
      let lastUrl = location.href;
      new MutationObserver(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          if (location.pathname.startsWith('/feed')) {
            observer.stop();
            processed = new WeakSet();
            waitForFeedAndProcess();
            if (currentConfig.sortByRecent) sortEnforcer.restart();
          }
        }
      }).observe(document.body, { childList: true, subtree: false });
    }
  } catch (err) {
    console.warn('[LFF] Initialization error:', err);
  }
}

/**
 * Poll until the feed has renderable items, then start processing.
 * LinkedIn's React app can take 2–5s after document_idle to hydrate the feed.
 */
async function waitForFeedAndProcess() {
  const MAX_ATTEMPTS = 20;
  const INTERVAL_MS = 500;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const feed = feedDetector.find();
    const items = itemDetector.find(feed);
    if (attempt === 0) console.log('[LFF] Feed candidate:', feed, `rep=${feedDetector._repetitionScore(feed).toFixed(2)} own=${feedDetector._ownershipRatio(feed).toFixed(2)}`);

    if (items.length > 0) {
      console.log(`[LFF] Feed container:`, feed);
      console.log(`[LFF] Found ${items.length} items (attempt ${attempt + 1}):`);
      const feedText = (feed.innerText || '').length;
      items.forEach((el, i) => {
        const share = feedText > 0 ? ((el.innerText||'').length / feedText * 100).toFixed(1) : '?';
        console.log(`  [${i}] share=${share}% | ${(el.innerText||'').trim().slice(0,80).replace(/\n/g,' ')}`, el);
      });
      for (const item of items) {
        processItem(item);
      }
      observer.start(feed, processItem);
      return;
    }

    await new Promise(r => setTimeout(r, INTERVAL_MS));
  }

  // Even if we found nothing, start the observer so we catch items as they load
  console.warn('[LFF] No feed items found after polling — starting observer anyway');
  observer.start(feedDetector.find(), processItem);
}

function reprocess() {
  try {
    processed = new WeakSet();
    waitForFeedAndProcess();
  } catch (err) {
    console.warn('[LFF] Reprocess error:', err);
  }
}

// ---------------------------------------------------------------------------
// Sidebar ad remover — watches the right-rail independently of the feed.
// LinkedIn injects "Promoted" ad units into the aside/right column.
// We look for any container whose direct text includes a "Promoted" badge
// and hide it. Uses MutationObserver so new ads injected dynamically are caught.
// ---------------------------------------------------------------------------

const sidebarAdRemover = {
  _mo: null,

  // Find the "Promoted" badge node itself, then walk UP to the tightest
  // ancestor that looks like a self-contained ad card (small text budget,
  // not a layout wrapper). Cap at 500px² of text or 8 levels up.
  _findAdCard(badge) {
    let el = badge;
    for (let i = 0; i < 8; i++) {
      const parent = el.parentElement;
      if (!parent || ['ASIDE', 'MAIN', 'BODY', 'HTML'].includes(parent.tagName)) break;
      // Stop if the parent contains a huge amount of text (it's a layout wrapper)
      const parentText = (parent.innerText || '').length;
      if (parentText > 1200) break;
      el = parent;
    }
    return el;
  },

  _processNode(root) {
    if (!currentConfig.hideSidebarAds) return;
    // Find Promoted badges — short leaf text nodes only, outside the main feed
    const candidates = root.querySelectorAll ? root.querySelectorAll('span, div, a') : [];
    for (const node of candidates) {
      if (node.closest('[data-testid="mainFeed"]')) continue;
      if (node.children.length > 2) continue; // not a leaf-like node
      const t = (node.innerText || '').trim();
      if (t.length < 80 && /^(promoted|sponsored|promoted by .+|promoted\s*[·•]\s*.+)$/i.test(t)) {
        const card = this._findAdCard(node);
        if (!card.hasAttribute('data-lff-sidebar-hidden')) {
          card.setAttribute('data-lff-sidebar-hidden', 'true');
          card.style.display = 'none';
        }
      }
    }
  },

  _hideAdIframes() {
    // LinkedIn injects right-rail display ads as iframes (about:blank, cross-origin).
    // We can't read their content, but we can identify them by size + position:
    // they sit in the right column (x > 600) and have standard IAB ad dimensions.
    document.querySelectorAll('iframe').forEach(frame => {
      if (frame.hasAttribute('data-lff-sidebar-hidden')) return;
      const rect = frame.getBoundingClientRect();
      // Must be positioned in the right half of the viewport
      if (rect.left < 500) return;
      // Must look like an ad unit (300×250 medium rectangle, 300×600 half-page, etc.)
      const isAdSize = (rect.width >= 250 && rect.width <= 340) &&
                       (rect.height >= 50 && rect.height <= 650);
      if (!isAdSize) return;
      // Walk up to find the containing card and hide it
      const card = this._findAdCard(frame) || frame;
      card.setAttribute('data-lff-sidebar-hidden', 'true');
      card.style.display = 'none';
    });
  },

  _scan() {
    this._processNode(document.body);
    this._hideAdIframes();
  },

  start() {
    this._scan();
    const debounced = (() => {
      let t;
      return (fn) => { clearTimeout(t); t = setTimeout(fn, 300); };
    })();

    this._mo = new MutationObserver((mutations) => {
      if (!currentConfig.hideSidebarAds) return;
      const hasNew = mutations.some(m => m.addedNodes.length > 0);
      if (hasNew) debounced(() => this._scan());
    });
    this._mo.observe(document.body, { childList: true, subtree: true });
  },

  stop() {
    if (this._mo) { this._mo.disconnect(); this._mo = null; }
    document.querySelectorAll('[data-lff-sidebar-hidden]').forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-lff-sidebar-hidden');
    });
  },

  restart() {
    this.stop();
    if (currentConfig.hideSidebarAds) this.start();
  }
};

// ---------------------------------------------------------------------------
// Diagnostic panel — injected into the page, toggled via popup or console
// ---------------------------------------------------------------------------

const diagnosticPanel = {
  _el: null,

  show() {
    if (this._el) { this._el.remove(); this._el = null; }

    const feed = feedDetector.find();
    const items = itemDetector.find(feed);

    const feedRect = (() => { try { return feed.getBoundingClientRect(); } catch { return {}; } })();
    const feedTag = feed === document.body ? 'body (fallback)' : `<${feed.tagName.toLowerCase()}>`;

    // Score each found item
    const scored = items.map(el => {
      const { score, reasons, category } = classifier.score(el, currentConfig);
      const text = (el.innerText || '').trim().slice(0, 60).replace(/\n/g, ' ');
      return { el, score, reasons, category, text };
    }).sort((a, b) => b.score - a.score);

    const hidden = scored.filter(i => i.score >= currentConfig.threshold).length;
    const collapsed = scored.filter(i => i.score >= currentConfig.collapseThreshold && i.score < currentConfig.threshold).length;
    const organic = scored.filter(i => i.score < currentConfig.collapseThreshold).length;

    const panel = document.createElement('div');
    panel.id = 'lff-diagnostic-panel';
    panel.style.cssText = [
      'position:fixed', 'top:60px', 'right:16px', 'z-index:2147483647',
      'width:380px', 'max-height:80vh', 'overflow-y:auto',
      'background:#1a1a2e', 'color:#e2e8f0', 'font-family:monospace',
      'font-size:12px', 'border-radius:10px', 'box-shadow:0 8px 32px rgba(0,0,0,0.5)',
      'border:1px solid #2d3748'
    ].join(';');

    // Header row
    const header = document.createElement('div');
    header.style.cssText = 'padding:12px 14px 8px;border-bottom:1px solid #2d3748;display:flex;align-items:center;justify-content:space-between;';
    const headerTitle = document.createElement('span');
    headerTitle.style.cssText = 'font-weight:700;color:#63b3ed;font-size:13px;';
    headerTitle.textContent = '🔍 LFF Diagnostics';
    const closeBtn = document.createElement('button');
    closeBtn.id = 'lff-diag-close';
    closeBtn.style.cssText = 'background:none;border:none;color:#718096;font-size:16px;cursor:pointer;padding:0 2px;line-height:1;';
    closeBtn.textContent = '\xD7';
    header.appendChild(headerTitle);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Feed info row
    const feedSection = document.createElement('div');
    feedSection.style.cssText = 'padding:10px 14px;border-bottom:1px solid #2d3748;';
    const feedLabel = document.createElement('div');
    feedLabel.style.cssText = 'color:#a0aec0;margin-bottom:4px;';
    feedLabel.textContent = 'Feed container detected:';
    const feedTagEl = document.createElement('div');
    feedTagEl.style.cssText = 'color:#68d391;';
    feedTagEl.textContent = feedTag;
    const feedInfo = document.createElement('div');
    feedInfo.style.cssText = 'color:#718096;font-size:11px;';
    feedInfo.textContent = feedRect.width
      ? `${Math.round(feedRect.width)}\xD7${Math.round(feedRect.height)}px \xB7 ${feed.children.length} direct children`
      : `no rect \xB7 ${feed.children.length} direct children`;
    feedSection.appendChild(feedLabel);
    feedSection.appendChild(feedTagEl);
    feedSection.appendChild(feedInfo);
    panel.appendChild(feedSection);

    // Counts row
    const countsSection = document.createElement('div');
    countsSection.style.cssText = 'padding:10px 14px;border-bottom:1px solid #2d3748;';
    const countTitle = document.createElement('div');
    countTitle.style.cssText = 'color:#a0aec0;margin-bottom:6px;';
    countTitle.textContent = `Items found: ${items.length}`;
    const countBadges = document.createElement('div');
    countBadges.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';
    const mkBadge = (bg, color, text) => {
      const s = document.createElement('span');
      s.style.cssText = `background:${bg};color:${color};padding:2px 8px;border-radius:12px;`;
      s.textContent = text;
      return s;
    };
    countBadges.appendChild(mkBadge('#e53e3e22', '#fc8181', `🚫 ${hidden} hide`));
    countBadges.appendChild(mkBadge('#d69e2e22', '#f6e05e', `▼ ${collapsed} collapse`));
    countBadges.appendChild(mkBadge('#38a16922', '#68d391', `✓ ${organic} organic`));
    countsSection.appendChild(countTitle);
    countsSection.appendChild(countBadges);
    panel.appendChild(countsSection);

    // Scored items list
    const scoresSection = document.createElement('div');
    scoresSection.style.cssText = 'padding:10px 14px;';
    const scoresTitle = document.createElement('div');
    scoresTitle.style.cssText = 'color:#a0aec0;margin-bottom:6px;';
    scoresTitle.textContent = 'Item scores (top 20):';
    scoresSection.appendChild(scoresTitle);

    if (scored.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#4a5568;font-style:italic;';
      empty.textContent = 'No items found — feed may still be loading';
      scoresSection.appendChild(empty);
    } else {
      scored.slice(0, 20).forEach(({ score, category, reasons, text }) => {
        const pct = Math.round(score * 100);
        const barColor = score >= currentConfig.threshold ? '#e53e3e'
          : score >= currentConfig.collapseThreshold ? '#d69e2e' : '#38a169';
        const labelChar = score >= currentConfig.threshold ? '🚫'
          : score >= currentConfig.collapseThreshold ? '▼' : '✓';

        const row = document.createElement('div');
        row.style.cssText = 'margin-bottom:8px;padding:6px 8px;background:#2d3748;border-radius:6px;';

        const rowHeader = document.createElement('div');
        rowHeader.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';

        const icon = document.createElement('span');
        icon.textContent = labelChar;

        const barWrap = document.createElement('div');
        barWrap.style.cssText = 'flex:1;height:6px;background:#1a1a2e;border-radius:3px;overflow:hidden;';
        const bar = document.createElement('div');
        bar.style.cssText = `width:${pct}%;height:100%;background:${barColor};transition:width 0.3s;`;
        barWrap.appendChild(bar);

        const pctSpan = document.createElement('span');
        pctSpan.style.cssText = `color:${barColor};font-weight:700;min-width:32px;text-align:right;`;
        pctSpan.textContent = `${pct}%`;

        const catSpan = document.createElement('span');
        catSpan.style.cssText = 'color:#718096;font-size:10px;';
        catSpan.textContent = category || 'organic';

        rowHeader.appendChild(icon);
        rowHeader.appendChild(barWrap);
        rowHeader.appendChild(pctSpan);
        rowHeader.appendChild(catSpan);

        const textEl = document.createElement('div');
        textEl.style.cssText = 'color:#a0aec0;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        textEl.setAttribute('title', text);
        textEl.textContent = text || '(no text)';

        const reasonsEl = document.createElement('div');
        reasonsEl.style.cssText = 'color:#4a5568;font-size:10px;margin-top:2px;';
        reasonsEl.textContent = reasons.slice(0, 2).join(' \xB7 ');

        row.appendChild(rowHeader);
        row.appendChild(textEl);
        row.appendChild(reasonsEl);
        scoresSection.appendChild(row);
      });
    }
    panel.appendChild(scoresSection);

    // Footer buttons
    const footer = document.createElement('div');
    footer.style.cssText = 'padding:8px 14px 12px;border-top:1px solid #2d3748;display:flex;gap:8px;';
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'lff-diag-refresh';
    refreshBtn.style.cssText = 'flex:1;background:#2b4c7e;color:#90cdf4;border:none;border-radius:6px;padding:6px;cursor:pointer;font-family:monospace;font-size:11px;';
    refreshBtn.textContent = '↻ Refresh';
    const highlightBtn = document.createElement('button');
    highlightBtn.id = 'lff-diag-highlight';
    highlightBtn.style.cssText = 'flex:1;background:#2d3748;color:#e2e8f0;border:none;border-radius:6px;padding:6px;cursor:pointer;font-family:monospace;font-size:11px;';
    highlightBtn.textContent = '🎯 Highlight items';
    footer.appendChild(refreshBtn);
    footer.appendChild(highlightBtn);
    panel.appendChild(footer);

    document.body.appendChild(panel);
    this._el = panel;

    panel.querySelector('#lff-diag-close').addEventListener('click', () => this.hide());
    panel.querySelector('#lff-diag-refresh').addEventListener('click', () => this.show());
    panel.querySelector('#lff-diag-highlight').addEventListener('click', () => {
      this._highlightItems(scored);
    });

    // Hover: highlight the corresponding element on page
    scored.slice(0, 20).forEach(({ el, score }, i) => {
      const row = panel.querySelectorAll('[style*="background:#2d3748"]')[i];
      if (!row) return;
      const borderColor = score >= currentConfig.threshold ? '#e53e3e'
        : score >= currentConfig.collapseThreshold ? '#d69e2e' : '#38a169';
      row.style.cursor = 'pointer';
      row.addEventListener('mouseenter', () => {
        el._lffOrigOutline = el.style.outline;
        el.style.outline = `3px solid ${borderColor}`;
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      row.addEventListener('mouseleave', () => {
        el.style.outline = el._lffOrigOutline || '';
      });
    });
  },

  hide() {
    if (this._el) { this._el.remove(); this._el = null; }
    // Remove highlights
    document.querySelectorAll('[data-lff-highlighted]').forEach(el => {
      el.style.outline = el._lffOrigOutline || '';
      el.removeAttribute('data-lff-highlighted');
    });
  },

  toggle() {
    if (this._el) { this.hide(); } else { this.show(); }
  },

  _highlightItems(scored) {
    scored.forEach(({ el, score }) => {
      const borderColor = score >= currentConfig.threshold ? '#e53e3e'
        : score >= currentConfig.collapseThreshold ? '#d69e2e' : '#38a169';
      el._lffOrigOutline = el.style.outline;
      el.style.outline = `3px solid ${borderColor}`;
      el.setAttribute('data-lff-highlighted', 'true');
    });
  }
};

// ---------------------------------------------------------------------------
// Debug API — accessible from DevTools console as window.__lff
// ---------------------------------------------------------------------------

// Firefox content scripts run in a sandbox — window.__lff set here is invisible
// to the page console. Bridge it by posting a serialisable snapshot and also by
// injecting a thin relay script into the page that forwards calls back via events.
const _lffAPI = {
  get config() { return { ...currentConfig }; },
  get stats() { return { hiddenThisSession: stats.count }; },
  reprocess,
  restoreAll: () => renderer.restoreAll(),
  diagnose: () => diagnosticPanel.show(),

  enableDebug: () => {
    currentConfig.debugOverlay = true;
    browser.storage.sync.set({ debugOverlay: true });
    reprocess();
  },
  disableDebug: () => {
    currentConfig.debugOverlay = false;
    browser.storage.sync.set({ debugOverlay: false });
    renderer.restoreAll();
    reprocess();
  },

  // Inspect the classifier result for any element.
  // Usage: __lff.inspectItem($0)  (where $0 is the selected element in Inspector)
  inspectItem: (el) => {
    const result = classifier.score(el, currentConfig);
    console.table({ score: result.score, category: result.category });
    console.log('Reasons:', result.reasons);
    return result;
  },

  // Show what feedDetector found and WHY — scores all candidates, not just the winner.
  // Usage: __lff.whyFeed()
  whyFeed: () => {
    const rows = [];
    for (const el of document.querySelectorAll('div, section, ul, ol, main')) {
      try {
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        if (style.position === 'fixed' || style.position === 'sticky') continue;
        if (el.children.length < 3) continue;
        const rep = feedDetector._repetitionScore(el);
        const own = feedDetector._ownershipRatio(el);
        const score = rep * own;
        if (score > 0) {
          rows.push({
            score: +score.toFixed(3),
            repetition: +rep.toFixed(3),
            ownership: +own.toFixed(3),
            tag: el.tagName.toLowerCase(),
            id: el.id || '—',
            classes: el.className?.toString().slice(0, 40) || '—',
            children: el.children.length,
            textLen: (el.innerText || '').length,
            el
          });
        }
      } catch { /* skip */ }
    }
    rows.sort((a, b) => b.score - a.score);
    console.log('%c__lff.whyFeed() — top candidates (winner is first)', 'font-weight:bold');
    console.table(rows.slice(0, 15).map(({ el: _el, ...r }) => r));
    rows.slice(0, 3).forEach((r, i) => {
      r.el.style.outline = i === 0 ? '4px solid #0077B5' : '2px dashed #aaa';
      r.el._lffDebugOutline = true;
      console.log(`#${i + 1} (score ${r.score})`, r.el);
    });
    console.log('Call __lff.clearOutlines() to remove highlights');
    return rows;
  },

  // Show what itemDetector found inside the detected feed.
  // Usage: __lff.whyItems()
  whyItems: () => {
    const feed = feedDetector.find();
    console.log('%cFeed container:', 'font-weight:bold', feed);
    feed.style.outline = '3px solid #0077B5';

    const items = itemDetector.find(feed);
    console.log(`%cFound ${items.length} items:`, 'font-weight:bold');

    const feedText = (feed.innerText || '').length;
    items.forEach((el, i) => {
      const text = (el.innerText || '').trim();
      const share = feedText > 0 ? (text.length / feedText * 100).toFixed(1) : '?';
      const { score, category } = classifier.score(el, currentConfig);
      el.style.outline = score >= currentConfig.threshold ? '3px solid #e53e3e'
        : score >= currentConfig.collapseThreshold ? '3px solid #d69e2e'
        : '3px solid #38a169';
      el._lffDebugOutline = true;
      console.log(
        `  [${i}] score=${score.toFixed(2)} cat=${category || 'organic'} share=${share}% | ${text.slice(0, 60).replace(/\n/g,' ')}`,
        el
      );
    });
    console.log('Call __lff.clearOutlines() to remove highlights');
    return items;
  },

  // Score all direct children of any element and show a table.
  // Usage: __lff.scoreChildren($0)
  scoreChildren: (el) => {
    const children = [...(el || feedDetector.find()).children];
    const results = children.map((child, i) => {
      const { score, category } = classifier.score(child, currentConfig);
      return {
        i,
        score: +score.toFixed(2),
        category: category || 'organic',
        textShare: +((child.innerText || '').length / Math.max((el?.innerText||'').length,1) * 100).toFixed(1) + '%',
        preview: (child.innerText || '').trim().slice(0, 50).replace(/\n/g, ' '),
        el: child
      };
    });
    console.table(results.map(({ el: _el, ...r }) => r));
    return results;
  },

  // Remove all debug outlines added by whyFeed / whyItems.
  clearOutlines: () => {
    document.querySelectorAll('*').forEach(el => {
      if (el._lffDebugOutline) {
        el.style.outline = '';
        delete el._lffDebugOutline;
      }
    });
  },

  findFeed: () => feedDetector.find(),
  findItems: () => {
    const feed = feedDetector.find();
    return itemDetector.find(feed);
  }
};

// Assign to content script window.
// Chrome: page console can access this directly as window.__lff.
// Firefox: page console cannot see content script globals — use:
//   wrappedJSObject.__lff.whyFeed()
window.__lff = _lffAPI;
console.log('[LFF] debug API ready. Chrome: __lff.whyFeed()  Firefox: wrappedJSObject.__lff.whyFeed()');

// Start when DOM is ready (content script runs at document_idle, so it's safe)
initialize();
