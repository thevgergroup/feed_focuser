# Feed Focuser — Developer Guide

## Build from source

```bash
git clone https://github.com/thevgergroup/feed_focuser.git
cd feed_focuser
npm install
npm test          # run unit tests
npm run lint      # check code quality
```

The `extension/` folder is the unpacked extension — load it directly in Chrome via **Load unpacked** at `chrome://extensions`.

To build the distributable artifacts:

```bash
npm run build
```

This produces `dist/feed-focuser-chrome.zip` and `dist/feed-focuser-firefox.xpi`.

## Release process

Releases are triggered by pushing a version tag. The tag must match the `version` field in `extension/manifest.json`.

```bash
# Bump version in extension/manifest.json and extension/popup.html, then:
git commit -am "chore: bump to vX.Y.Z"
git tag vX.Y.Z
git push && git push origin vX.Y.Z
```

The CI pipeline will:
1. Lint and test
2. Build the Chrome zip
3. Sign the Firefox XPI (unlisted, for immediate install via GitHub release)
4. Submit to Firefox AMO listed channel (async — Mozilla emails when approved)
5. Create a GitHub release with both artifacts attached

## Publishing to Chrome Web Store

After the first manual submission, use the manual dispatch workflow:

```
GitHub → Actions → "Publish to Chrome Web Store" → Run workflow → enter version
```

Requires `CWS_EXTENSION_ID` to be set as a repo secret in `thevgergroup/feed_focuser`.

## Project structure

```
extension/       # The unpacked extension (load this in Chrome for dev)
  content.js     # Feed classifier, label learner, renderer, observer
  popup.js       # Popup UI logic
  popup.html     # Popup markup
  popup.css      # Popup styles
  manifest.json  # Extension manifest (MV3)
  icons/         # PNG icons (16, 48, 128px)
tests/           # Vitest unit tests
  classifier.test.js   # Classifier scoring tests
  helpers/             # JSDOM browser environment shim
scripts/
  build.mjs      # Builds Chrome zip and Firefox XPI
.github/
  workflows/
    ci.yml               # Lint + test on push to main
    release.yml          # Build, sign, release on version tags
    publish-chrome.yml   # Manual Chrome Web Store publish
```

## Architecture overview

`content.js` is structured as a set of cooperating modules (all in one file for MV3 compatibility):

| Module | Role |
|---|---|
| `feedDetector` | Finds the feed container using repetition + ownership scoring — no hardcoded selectors |
| `itemDetector` | Finds feed card elements within the container using text-share heuristics |
| `textExtractor` | Extracts all visible and accessible text from a card |
| `classifier` | Scores each card 0–1 across multiple weak signals; returns score + category + reasons |
| `labelLearner` | Observes definitively-classified ad cards to learn region/language-specific label variants |
| `userLearning` | Persists per-card user overrides (allow/hide) keyed by a content fingerprint |
| `renderer` | Collapses or hides cards; renders the strip UI with expand/Always-show controls |
| `observer` | MutationObserver + 2s interval to process new cards as LinkedIn infinite-scrolls |
| `sortEnforcer` | Detects when LinkedIn resets feed sort to "Top" and clicks it back to "Recent" |

### Classifier signal hierarchy

1. **Definitive labels** — "Promoted", "Sponsored", "Promoted by X", "Promoted · Partnership with Y" → score 1.0, category `ads`
2. **Reshare filter** — "X likes/celebrates/reposts this" header + engagement below threshold → score 1.0, category `reshare`
3. **Positional context label** — image-free top-of-card child containing function words ("from your activity", "recommended for you", etc.) → score 1.0, category `suggested`
4. **Weighted signals** — promo terms, follower counts, CTA buttons, external links, missing organic actions, connection degree → cumulative score
5. **Organic discounts** — 1st-degree connection, timestamp, standard action buttons, liked by connection → reduce score

### Reshare detection

`_detectReshare(el)` walks **text nodes** (not element nodes) across the card looking for the social-proof header pattern `\b(likes?|celebrates?|reposts?|...) this\b`. The header sits ~476 element-walker steps into the card but only ~4 text-walker steps.

`_countEngagement(el)` sums numeric text nodes, skipping any inside `<a>` tags (LinkedIn repeats counts there as accessible link labels) and deduplicating by parent element.

## Verifying the running version

Each build embeds a timestamp in the injected style element:

```js
document.getElementById('lff-styles')?.dataset.lffBuild
// → "2026-07-22T17:37"
```

Update `LFF_BUILD` in `content.js` whenever you make a change, so you can confirm the new code is active after reloading the extension.

## Dev workflow

1. Edit files in `extension/`
2. Update `LFF_BUILD` timestamp in `content.js`
3. Go to `chrome://extensions/` → hit **Reload** on Feed Focuser
4. Refresh the LinkedIn tab
5. Verify: `document.getElementById('lff-styles')?.dataset.lffBuild` matches your timestamp
6. Run tests: `npm test`

## Secrets

Shared secrets live at the `thevgergroup` org level (inherited by all repos):

| Secret | Purpose |
|---|---|
| `CWS_CLIENT_EMAIL` | Google service account email for Chrome Web Store API |
| `CWS_PRIVATE_KEY` | Service account private key (PEM) |
| `MOZILLA_JWT_ISSUER` | AMO API key |
| `MOZILLA_JWT_SECRET` | AMO API secret |

Repo-level secrets (set on `thevgergroup/feed_focuser`):

| Secret | Purpose |
|---|---|
| `CWS_EXTENSION_ID` | Chrome extension ID (from Web Store dashboard) |
