/**
 * LinkedIn Feed Focuser — popup.js
 *
 * Loads config from storage, renders toggle state, saves on change,
 * and messages the active tab's content script for live updates.
 */

// Chrome/Firefox compatibility shim
const browser = typeof chrome !== 'undefined' ? chrome : globalThis.browser;

const DEFAULT_CONFIG = {
  hideAds: true,
  hideSuggested: true,
  hideNews: true,
  hidePromoted: true,
  hidePromotedConnections: true,
  hidePagePosts: true,
  hideSidebarAds: true,
  hide2ndDegree: false,
  hide3rdDegree: true,
  hiddenKeywords: [],
  sortByRecent: true,
  collapseMode: true,
  debugOverlay: false
};

// All toggle inputs in the popup, keyed by their data-config-key attribute
const toggleEls = {};

// Current keyword list (array of strings)
let currentKeywords = [];

// Learned labels from local storage: { [label]: { count, enabled } }
let learnedLabels = {};

/**
 * Load current config from sync storage and set toggle states.
 */
async function loadAndRender() {
  const config = await new Promise((resolve) => {
    browser.storage.sync.get(DEFAULT_CONFIG, (result) => {
      resolve({ ...DEFAULT_CONFIG, ...result });
    });
  });

  for (const [key, el] of Object.entries(toggleEls)) {
    el.checked = !!config[key];
  }

  currentKeywords = Array.isArray(config.hiddenKeywords) ? config.hiddenKeywords : [];
  renderKeywords();

  await loadAndRenderLearnedLabels();
  await renderStats();
}

/**
 * Read the hidden-today count from local storage and update the stat display.
 */
async function renderStats() {
  const statsCountEl = document.getElementById('stats-count');
  if (!statsCountEl) return;

  const result = await new Promise((resolve) => {
    browser.storage.local.get(['hiddenToday', 'date'], resolve);
  });

  const today = new Date().toISOString().slice(0, 10);
  const count = result.date === today ? (result.hiddenToday || 0) : 0;

  statsCountEl.textContent = count;
  statsCountEl.closest('.stats-row')?.classList.remove('is-loading');
}

/**
 * Load learned labels from local storage and render them.
 */
async function loadAndRenderLearnedLabels() {
  const result = await new Promise((resolve) => {
    browser.storage.local.get({ learnedLabels: {} }, resolve);
  });
  learnedLabels = result.learnedLabels || {};
  renderLearnedLabels();
}

const LEARNED_THRESHOLD = 3;

/**
 * Render the learned labels section. Shows only labels that have crossed the threshold.
 */
function renderLearnedLabels() {
  const container = document.getElementById('learned-labels');
  const section = document.getElementById('learned-section');
  const countEl = document.getElementById('learned-count');
  if (!container) return;

  const surfaced = Object.entries(learnedLabels)
    .filter(([, v]) => v.count >= LEARNED_THRESHOLD)
    .sort(([, a], [, b]) => b.count - a.count);

  if (section) section.style.display = surfaced.length === 0 ? 'none' : '';
  if (countEl) countEl.textContent = surfaced.length > 0 ? `(${surfaced.length})` : '';

  container.innerHTML = '';
  for (const [label, meta] of surfaced) {
    const row = document.createElement('div');
    row.className = 'learned-row';

    const labelGroup = document.createElement('div');
    labelGroup.className = 'learned-label-group';

    const text = document.createElement('span');
    text.className = 'learned-label-text';
    text.textContent = label;

    const count = document.createElement('span');
    count.className = 'learned-label-count';
    count.textContent = `×${meta.count}`;

    labelGroup.appendChild(text);
    labelGroup.appendChild(count);

    const controls = document.createElement('div');
    controls.className = 'learned-controls';

    // Toggle switch
    const switchId = `learned-toggle-${label.replace(/\W+/g, '-')}`;
    const switchLabel = document.createElement('label');
    switchLabel.className = 'toggle-switch toggle-switch--small';
    switchLabel.setAttribute('for', switchId);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = switchId;
    checkbox.checked = meta.enabled !== false;
    checkbox.setAttribute('role', 'switch');
    checkbox.setAttribute('aria-label', `Enable learned label: ${label}`);
    checkbox.addEventListener('change', () => {
      learnedLabels[label].enabled = checkbox.checked;
      saveLearnedLabels();
    });

    switchLabel.innerHTML = '<span class="toggle-track"><span class="toggle-thumb"></span></span>';
    switchLabel.prepend(checkbox);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'learned-remove';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `Remove learned label: ${label}`);
    removeBtn.addEventListener('click', () => {
      delete learnedLabels[label];
      saveLearnedLabels();
      renderLearnedLabels();
    });

    controls.appendChild(switchLabel);
    controls.appendChild(removeBtn);

    row.appendChild(labelGroup);
    row.appendChild(controls);
    container.appendChild(row);
  }
}

/**
 * Persist learned labels to local storage and notify the content script.
 */
async function saveLearnedLabels() {
  await new Promise((resolve) => {
    browser.storage.local.set({ learnedLabels }, resolve);
  });

  // Notify content script so it reloads and re-applies
  try {
    const tabs = await new Promise((resolve) => {
      browser.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    if (tabs.length > 0) {
      browser.tabs.sendMessage(tabs[0].id, {
        type: 'CONFIG_UPDATE',
        config: buildCurrentConfig()
      }).catch(() => {});
    }
  } catch { /* non-fatal */ }
}

function buildCurrentConfig() {
  const config = { hiddenKeywords: currentKeywords };
  for (const [key, el] of Object.entries(toggleEls)) {
    config[key] = el.checked;
  }
  return config;
}

/**
 * Render the keyword tag list inside #keyword-tags.
 */
function renderKeywords() {
  const container = document.getElementById('keyword-tags');
  if (!container) return;
  container.innerHTML = '';
  for (const kw of currentKeywords) {
    const tag = document.createElement('span');
    tag.className = 'kw-tag';
    tag.textContent = kw;
    const del = document.createElement('button');
    del.className = 'kw-tag-del';
    del.textContent = '×';
    del.setAttribute('aria-label', `Remove keyword ${kw}`);
    del.addEventListener('click', () => {
      currentKeywords = currentKeywords.filter(k => k !== kw);
      renderKeywords();
      saveAndBroadcast();
    });
    tag.appendChild(del);
    container.appendChild(tag);
  }
}

/**
 * Persist the full current config and notify the content script.
 */
async function saveAndBroadcast() {
  const config = buildCurrentConfig();

  // Persist to sync storage
  await new Promise((resolve) => {
    browser.storage.sync.set(config, resolve);
  });

  // Send live update to the active tab — content script applies without reload
  try {
    const tabs = await new Promise((resolve) => {
      browser.tabs.query({ active: true, currentWindow: true }, resolve);
    });

    if (tabs.length > 0) {
      browser.tabs.sendMessage(tabs[0].id, {
        type: 'CONFIG_UPDATE',
        config
      }).catch(() => {
        // Tab may not have the content script (e.g., not a /feed/ URL) — safe to ignore
      });
    }
  } catch {
    // Non-fatal: tab query can fail if the popup is detached
  }
}

/**
 * Initialize: wire up all toggles and load initial state.
 */
function init() {
  // Collect all toggle inputs
  document.querySelectorAll('input[data-config-key]').forEach((el) => {
    const key = el.getAttribute('data-config-key');
    toggleEls[key] = el;

    el.addEventListener('change', () => {
      saveAndBroadcast();
    });
  });

  // Keyword input: add on Enter or comma
  const kwInput = document.getElementById('keyword-input');
  if (kwInput) {
    kwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = kwInput.value.trim().replace(/,$/, '');
        if (val && !currentKeywords.includes(val)) {
          currentKeywords.push(val);
          renderKeywords();
          saveAndBroadcast();
        }
        kwInput.value = '';
      }
    });

    // Also add on blur if there's text
    kwInput.addEventListener('blur', () => {
      const val = kwInput.value.trim();
      if (val && !currentKeywords.includes(val)) {
        currentKeywords.push(val);
        renderKeywords();
        saveAndBroadcast();
        kwInput.value = '';
      }
    });
  }

  // Diagnose button: toggle the diagnostic panel on the active tab
  document.getElementById('btn-diagnose')?.addEventListener('click', async () => {
    try {
      const tabs = await new Promise(resolve =>
        browser.tabs.query({ active: true, currentWindow: true }, resolve)
      );
      if (tabs.length > 0) {
        await browser.tabs.sendMessage(tabs[0].id, { type: 'DIAGNOSE_TOGGLE' }).catch(() => {});
      }
      window.close();
    } catch {
      // Non-fatal
    }
  });

  // Mark stats row as loading until we have a value
  document.querySelector('.stats-row')?.classList.add('is-loading');

  loadAndRender();
}

document.addEventListener('DOMContentLoaded', init);

// Refresh learned labels if the content script signals new ones were discovered
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'LABELS_UPDATED') {
    loadAndRenderLearnedLabels();
  }
});
