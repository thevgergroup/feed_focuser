/**
 * Sets up a fake browser environment so content.js (a plain browser script)
 * can be imported into Node/Vitest via a dynamic script evaluation.
 *
 * happy-dom provides window/document. We add the chrome stub and then
 * eval the content script in that context, giving us access to all the
 * module-level objects (classifier, feedDetector, etc.) without touching
 * the source file.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_JS = resolve(__dirname, '../../extension/content.js');

export function loadContentScript() {
  const src = readFileSync(CONTENT_JS, 'utf8');

  // Build a minimal chrome stub — only what initialize() touches at startup
  const chromeSyncStorage = { data: {} };
  const chrome = {
    storage: {
      sync: {
        get: (defaults, cb) => cb({ ...defaults, ...chromeSyncStorage.data }),
        set: (data, cb) => { Object.assign(chromeSyncStorage.data, data); cb?.(); },
      },
      local: {
        get: (_keys, cb) => cb({}),
        set: (_data, cb) => cb?.(),
      },
    },
    runtime: {
      onMessage: { addListener: () => {} },
    },
    tabs: {
      query: (_q, cb) => cb([]),
      sendMessage: () => Promise.resolve(),
    },
  };

  // Expose globals that content.js references at the top level
  globalThis.chrome = chrome;
  globalThis.Node = globalThis.Node ?? { TEXT_NODE: 3, ELEMENT_NODE: 1 };

  // Suppress console output from the content script's initialization
  // (waitForFeedAndProcess logs to console, which clutters test output)
  const noop = () => {};
  const origLog = console.log;
  const origWarn = console.warn;
  console.log = noop;
  console.warn = noop;

  let exports;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('chrome', src + '\nreturn { classifier, feedDetector, itemDetector, textExtractor, matchesKeyword, categoryToConfigKey, DEFAULT_CONFIG };');
    exports = fn(chrome);
  } finally {
    console.log = origLog;
    console.warn = origWarn;
  }

  return exports;
}
