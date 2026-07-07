# Feed Focuser

A browser extension that cleans up your LinkedIn feed — collapsing or hiding ads, sponsored posts, "Recommended for you" suggestions, and other noise so you can focus on posts from people you actually follow.

**Runs entirely in your browser. No data is collected or sent anywhere.**

---

## Install

### Chrome / Edge / Brave

1. Go to the [Releases](https://github.com/pjaol/feed_focuser/releases) page and download `feed-focuser-chrome.zip`
2. Unzip it anywhere on your computer
3. Open Chrome and go to `chrome://extensions`
4. Turn on **Developer mode** (top-right toggle)
5. Click **Load unpacked** and select the unzipped `extension` folder
6. Navigate to [linkedin.com/feed](https://www.linkedin.com/feed) — the extension starts immediately

### Firefox

1. Go to the [Releases](https://github.com/pjaol/feed_focuser/releases) page and download `feed-focuser-firefox.xpi`
2. Open Firefox and go to `about:addons`
3. Click the gear icon → **Install Add-on From File…**
4. Select the downloaded `.xpi` file

> **Note:** Firefox requires the extension to be signed for permanent installation. For temporary use, go to `about:debugging` → **This Firefox** → **Load Temporary Add-on** and select the `.xpi` file.

---

## What it does

When you open your LinkedIn feed, Feed Focuser collapses filtered posts into a slim strip showing what was caught and why. Click the arrow on any strip to expand and read the post.

| Strip colour | What was caught |
|---|---|
| 🔴 **Ad** | Promoted or sponsored posts |
| 🔵 **Suggested** | "Recommended for you", "People you may know" |
| 🟡 **News** | LinkedIn News and trending topics |
| 🟣 **Brand post** | Company pages pushed into your feed |
| 🟢 **Keyword match** | Posts containing your custom keywords |

You can switch from collapsed strips to complete hiding in the extension popup.

---

## Settings

Click the Feed Focuser icon in your browser toolbar to open the popup.

**Hide by keyword** — type a word and press Enter to hide any post containing that text. Great for filtering out topics like "AI", "crypto", or "layoffs" when your feed gets overrun.

**Filter toggles** — turn individual categories on or off (Ads, Suggested, News, etc.)

**Connection degree** — choose whether posts from 2nd or 3rd-degree connections are treated as organic or filtered.

**Collapse / hide** — "Collapse filtered posts" (on by default) shows filtered items as slim strips. Turn it off to hide them completely.

**Learned labels** — as you scroll, Feed Focuser learns the exact label text LinkedIn uses for ads in your region and language (e.g. "Promoted · Partnership with X", "Patrocinado"). Once a label appears on 3+ ad cards it shows up here so you can toggle it on or off.

---

## Privacy

- All processing happens locally in your browser
- No analytics, no tracking, no external requests
- Settings are stored in your browser's built-in extension storage
- Nothing leaves your machine

---

## Build from source

```bash
git clone https://github.com/pjaol/feed_focuser.git
cd feed_focuser
npm install
npm test          # run unit tests
npm run lint      # check code quality
```

The `extension/` folder is the unpacked extension — load it directly in Chrome via **Load unpacked**.

To build the distributable artifacts:

```bash
npm run build
```

This produces `dist/feed-focuser-chrome.zip` and `dist/feed-focuser-firefox.xpi`.

---

## License

MIT — see [LICENSE](LICENSE)
