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
  content.js     # Feed classifier, label learner, renderer
  popup.js       # Popup UI logic
  popup.html     # Popup markup
  popup.css      # Popup styles
  manifest.json  # Extension manifest (MV3)
  icons/         # PNG icons (16, 48, 128px)
tests/           # Vitest unit tests
scripts/
  build.mjs      # Builds Chrome zip and Firefox XPI
.github/
  workflows/
    ci.yml               # Lint + test on push to main
    release.yml          # Build, sign, release on version tags
    publish-chrome.yml   # Manual Chrome Web Store publish
```

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
