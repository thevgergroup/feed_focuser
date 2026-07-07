# Store Submission Guide: Feed Focuser Extension

**Last Updated:** July 2026  
**Scope:** Chrome Web Store & Firefox AMO submission requirements for a LinkedIn feed-filtering browser extension

---

## 1. Chrome Web Store Submission

### 1.1 Developer Account Registration

**Cost:** $5 one-time registration fee (no recurring fees)

**Requirements:**
- Google Account with [2-step verification enabled](https://support.google.com/accounts/answer/185839)
- Payment method (Google Play accepted payment methods: credit/debit card, Google Play credit)
- Developer identity information (name, email, website)

**Registration URL:** https://developer.chrome.com/docs/webstore/register

**Timeline:** Registration is immediate after payment; first-time developer accounts may experience 7-14 business days of review on initial submissions while Google establishes trust.

---

### 1.2 Submission Package Requirements

**Manifest Requirements:**
- Manifest V3 only (Manifest V2 no longer accepted as of 2026)
- Required manifest fields:
  - `manifest_version: 3`
  - `name` (max 45 characters)
  - `version` (semver format)
  - `description` (max 132 characters)
  - `permissions` (see section 1.5)
  - `host_permissions` (for `*://*.linkedin.com/*`)
  - For extensions handling user data: `homepage_url`

**Store Listing Content:**
- **Extension icon:** 128x128 PNG (transparent background acceptable)
- **Screenshots:** Up to 5, must be 1280x800 or 640x400 pixels
  - Show actual UI; avoid promotional graphics
  - Clearly demonstrate feed filtering functionality
- **Short description:** 132 characters max
- **Detailed description:** 
  - Clearly state what your extension does
  - Explain why users need it
  - DO NOT overstate capabilities; avoid deceptive claims
- **Category:** Productivity, Utilities, or Developer Tools (your choice)
- **Support email:** Required for user-facing extensions
- **Privacy policy URL:** Required if extension uses `storage`, `tabs`, `scripting`, or collects any data
- **Homepage URL:** Recommended for user support

**Code & Assets:**
- No obfuscated code allowed (minification/transpilation are acceptable)
- Remote code execution is prohibited except via specific APIs (Debugger, User Scripts)
- All functionality must be declared in manifest and verifiable by reviewer

**Submission Format:**
- Package extension as `.zip` file (not compressed)
- Maximum file size: varies, but typically under 100 MB
- Include only files needed for extension to function

---

### 1.3 Permission Declaration & Justification

Your extension requires these permissions. **Each must have explicit justification in your store listing or privacy policy.**

**Required Permissions:**

| Permission | Manifest Entry | Justification Needed |
|-----------|-----------------|---------------------|
| `storage` | `"permissions": ["storage"]` | Storing user preferences (feed filter settings, last checked timestamp, etc.) |
| `tabs` | `"permissions": ["tabs"]` | Detecting when user navigates to LinkedIn feed pages |
| `scripting` | `"permissions": ["scripting"]` | Injecting content script to detect and filter feed elements |
| `*://*.linkedin.com/*` | `"host_permissions": ["*://*.linkedin.com/*"]` | Accessing LinkedIn feed DOM to identify and hide non-focused content |

**Permission Minimization Rule:** 
Chrome reviewers verify that your extension requests only the narrowest permissions necessary. Do not request permissions you don't actively use. Unused permissions = instant rejection.

**Privacy Policy Requirement:**
Since your extension accesses tab data and uses storage, you **must** provide a privacy policy URL that discloses:
- What data you collect (`storage` usage: feed filter settings only)
- How long data is retained
- Whether data is shared with third parties
- User's rights to delete data

See section 1.7 for privacy policy guidance.

---

### 1.4 Review Process & Timeline

**Timeline:**
- Established developer accounts: 2-5 business days
- New developer accounts: 7-14 business days
- Resubmissions after rejection: typically faster (2-3 days)

**Review Criteria Checklist:**
1. ✅ Manifest V3 format with all required fields
2. ✅ Icon, screenshots, descriptions provided and accurate
3. ✅ No code obfuscation
4. ✅ Permissions justified and necessary
5. ✅ Privacy policy URL present (if collecting data)
6. ✅ No malware, spyware, exploit kits
7. ✅ No deceptive functionality or misleading claims
8. ✅ Extension has single, clearly-defined purpose
9. ✅ No duplicate functionality across multiple extensions

**Appeal Process:**
- If rejected: reviewers email detailed rejection reason
- You get ONE appeal per violation
- Address feedback and resubmit; repeated violations = account suspension

**Policy Reference:** https://developer.chrome.com/docs/webstore/program-policies/policies

---

### 1.5 LinkedIn Trademark Considerations

**Critical:** LinkedIn does not permit third-party extensions and has aggressive enforcement as of 2026.

**LinkedIn's Position on Extensions:**
> "LinkedIn does not permit the use of any third party software, including browser extensions that scrape, modify the appearance of, or automate activity on LinkedIn's website."

**Enforcement Escalation (2026):**
- Q1 2026: LinkedIn deployed updated detection systems across all regions
- Suspicious sessions flagged within 48 hours (vs. weeks previously)
- Q1 2026 Transparency Report: 78.2M fake accounts blocked, 23.5M automated sessions flagged in single quarter
- Accounts using detected extensions face account restrictions or suspension

**Trademark Usage Policy:**
LinkedIn does not permit third-party developers to use "LinkedIn" in extension names, descriptions, or marketing materials unless:
1. The tool is officially partnered through LinkedIn's Partner Program (requires formal approval)
2. You use strictly descriptive phrasing: "works with LinkedIn" or "[Extension Name] for LinkedIn"
3. Your extension does NOT scrape, automate, or modify LinkedIn's appearance
4. Your branding clearly indicates no affiliation with LinkedIn

**Chosen Name:** "Feed Focuser" — neutral, no LinkedIn trademark used at all. Safest possible approach.

**Store listing description** should mention it works with LinkedIn in body text only (descriptive use, not in the name).

**Support email:** hello@thevgergroup.com  
**Privacy policy URL:** https://thevgergroup.com/privacy-policy/

**Description Phrasing:**
- Name: "Feed Focuser" (no LinkedIn trademark in the name)
- Body text may describe LinkedIn as the site it works on (descriptive use)
- Include: "This is a third-party extension not affiliated with or endorsed by LinkedIn"
- Support: hello@thevgergroup.com
- Privacy policy: https://thevgergroup.com/privacy-policy/

**Key Risks:**
- LinkedIn may request takedown if they determine extension violates terms
- Your extension may be blocked by LinkedIn's content script protections
- User accounts using your extension risk restriction/suspension per LinkedIn's ToS

**Reference:** 
- LinkedIn User Agreement violation: https://www.linkedin.com/legal/user-agreement
- LinkedIn Prohibited Software Policy: https://www.linkedin.com/help/linkedin/answer/a1341387

---

### 1.6 Chrome Web Store Intellectual Property Policy

**What Google Enforces:**
- No use of Google trademarks or confusingly similar marks
- No infringement on third-party IP (patents, trademarks, copyrights, trade secrets)
- Extensions using brand names + brand colors in ways that imply affiliation are removed upon complaint

**Real-World Precedent:**
Extensions using "[Brand] for [Name]" format with official brand colors/styling have been removed after trademark complaints, even with "for" phrasing, if the visual design implies association.

**Your Extension Safeguards:**
- Use neutral color scheme (avoid LinkedIn's navy/white styling)
- Include clear disclaimer: "Unofficial third-party tool"
- Use original branding/icon (don't replicate LinkedIn design)
- Reference LinkedIn only in descriptive, functional terms

**Reporting Process:**
If LinkedIn or another party files a trademark complaint against your extension:
1. You receive formal notice via email
2. Extension may be removed pending resolution
3. You can file a Counter-Notice if you believe the claim is incorrect
4. Disputes resolved through formal legal process

**Reference:** https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property

---

### 1.7 Privacy Policy & Compliance

**Required Privacy Policy Contents:**

```
Feed Focuser Privacy Policy

Last Updated: [Date]

1. Data Collection
   - Feed filter preferences (stored locally in browser storage)
   - Last feed check timestamp (stored locally)
   - No personal information is collected or transmitted

2. Data Storage
   - All data stored locally in browser via Chrome storage API
   - Data persists until user uninstalls extension or clears browser data
   - No data sent to external servers

3. Data Sharing
   - No data is shared with third parties
   - No analytics, tracking, or telemetry

4. User Rights
   - Users can delete all stored data by clearing browser data
   - Users can disable the extension at any time via Chrome settings
   - No accounts or authentication required

5. Updates & Changes
   - Privacy policy may be updated; users will be notified via extension update
   - Continued use indicates acceptance of updated policy
```

**Hosting:**
- Host on your own website (GitHub Pages, personal site, etc.)
- URL must be accessible from anywhere
- Must remain live for life of extension

---

### 1.8 CI/CD Automation (Chrome Web Store Publishing)

**Official API:** Chrome Web Store API v2

**Authentication:**
1. Enable 2-step verification on your Google Account (required)
2. Create OAuth 2.0 credentials in Google Cloud Console
3. Generate refresh token via OAuth Playground
4. Store refresh token securely in CI/CD secrets (GitHub Actions, etc.)

**Key Endpoints:**
```
GET/POST https://chromewebstore.googleapis.com/v2/publishers/{PUBLISHER_ID}/items/{EXTENSION_ID}:uploadStatus
POST https://chromewebstore.googleapis.com/v2/publishers/{PUBLISHER_ID}/items/{EXTENSION_ID}:upload
POST https://chromewebstore.googleapis.com/v2/publishers/{PUBLISHER_ID}/items/{EXTENSION_ID}:publish
POST https://chromewebstore.googleapis.com/v2/publishers/{PUBLISHER_ID}/items/{EXTENSION_ID}:setPublishedDeployPercentage
```

**All requests require:**
```
Authorization: Bearer {ACCESS_TOKEN}
```

Access token expires after 3600 seconds; refresh token generates new tokens on demand.

**Recommended Tools:**

| Tool | Type | Status |
|------|------|--------|
| [release-please](https://github.com/googleapis/release-please) | GitHub Action | ✅ Official Google tool; integrates Chrome Web Store API |
| [cws-publish](https://github.com/MobileFirstLLC/cws-publish) | npm package | ✅ Well-maintained; works with Travis CI, GitLab CI, GitHub Actions |
| [Publish Chrome Extension](https://github.com/marketplace/actions/publish-chrome-extension-to-chrome-web-store) | GitHub Action | ✅ Community-maintained; straightforward workflow |

**Example GitHub Actions Workflow (using cws-publish):**

```yaml
name: Publish to Chrome Web Store

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build extension
        run: npm run build
      
      - name: Publish to Chrome Web Store
        uses: MobileFirstLLC/cws-publish@v2
        with:
          refresh-token: ${{ secrets.CWS_REFRESH_TOKEN }}
          extension-id: ${{ secrets.EXTENSION_ID }}
          zip-path: dist/extension.zip
```

**Secret Setup:**
1. Generate refresh token from Google Cloud Console OAuth Playground
2. Add `CWS_REFRESH_TOKEN` as GitHub secret
3. Add `EXTENSION_ID` (from Chrome Web Store dashboard) as GitHub secret

**Reference:** https://developer.chrome.com/docs/webstore/using-api

---

## 2. Firefox AMO (Addons.mozilla.org) Submission

### 2.1 Developer Account Registration

**Cost:** Free

**Requirements:**
- Mozilla Account (create at account.mozilla.org)
- Email address (must be verified)
- Display name or company name
- Developer identity verification (varies by region)
- Two-factor authentication recommended (not required)

**Registration URL:** https://addons.mozilla.org/developers/

**Timeline:** Account creation is immediate; first extension submission may take 24 hours for automated review.

---

### 2.2 Submission Package Requirements

**Manifest Requirements:**
- Manifest V2 or V3 (both accepted, but V3 recommended)
- Required manifest fields:
  - `manifest_version: 3` (recommended) or `2`
  - `name` (human-readable extension name)
  - `version` (semver format)
  - `description` (50-250 characters)
  - For V3 with ID: `browser_specific_settings` with `gecko.id` (email format, ≤80 chars)
  - `permissions` and `host_permissions` as needed
  - `browser_action` (V2) or `action` (V3)

**Add-on ID (Manifest V3 only):**
```json
"browser_specific_settings": {
  "gecko": {
    "id": "feedfocuser@thevgergroup.com"
  }
}
```
Format: `^[a-zA-Z0-9-._]*@[a-zA-Z0-9-._]+$` (must look like email)

**Store Listing Content:**
- **Extension icon:** 32x32, 64x64, 128x128 PNG files (transparent background acceptable)
- **Screenshots:** Up to 5, recommended 1280x720 or 1600x900 pixels
  - Show actual functionality in use
  - Avoid promotional graphics
- **Name:** Clearly indicates purpose (see section 2.5 on naming)
- **Summary:** 50-250 characters describing core feature
- **Detailed description:** 
  - Explain what the extension does
  - List key features
  - Include clear disclaimer: "This is an unofficial tool not affiliated with LinkedIn"
- **Support email:** Required
- **Homepage URL:** Recommended
- **License:** Select appropriate license (MIT, GPL, etc., or "All Rights Reserved")
- **Category:** Productivity or Utilities
- **Privacy policy:** Required if extension collects/sends data

**Code Requirements:**
- **Source code transparency:** If extension uses minified or obfuscated code, you must provide unminified source code in a separate archive
  - Reviewers use this to verify no hidden malware/tracking
  - Minification/transpilation are acceptable if source is provided
- **No remote code execution** except where explicitly permitted (User Scripts APIs)

**Submission Format:**
- Package as `.zip`, `.xpi`, or `.crx` file
- Maximum file size: 200 MB
- Include only necessary files (don't include node_modules, build tools, etc.)

**Source Code Archive (if obfuscated):**
- Create separate `.zip` with unminified source
- Include `README` explaining build process
- Must match submitted binary when built

---

### 2.3 Review Process & Timeline

**Automated Review:**
1. All submissions undergo automatic validator check
   - Detects syntax errors, unsafe permissions, etc.
   - Takes seconds to minutes
   - Warnings may appear but submissions can proceed
   - Security/privacy warnings may block submission

2. **Results:**
   - ✅ Pass: Extension moves to signing (see section 2.4)
   - ⚠️ Warnings: Proceed if non-blocking; note for reviewers
   - ❌ Fail: Fix errors and resubmit

**Manual Review:**
- Triggered for: policy compliance concerns, security flags, permissions requiring justification
- Timeline: Up to 24 hours for initial review; can extend if issues found
- Outcome: Email notification with approval/rejection reason
- Appeal: Resubmit with corrections or formal appeal via AMO support

**Post-Submission Monitoring:**
- Extension may be subject to further review at any time post-publication
- Mozilla can suspend extension if compliance issues discovered
- Updates are reviewed with same process as initial submission

**Timeline Summary:**
- Automated validation: seconds to minutes
- Signing (if passes validation): up to 24 hours
- Manual review (if triggered): up to 24 hours additional
- Total initial submission: 1-48 hours
- Updates: 1-24 hours (usually faster than initial)

---

### 2.4 Signing Requirements (Critical)

**Requirement:** All Firefox extensions must be signed by Mozilla before installation in release/beta versions.

**Signing Methods:**

| Method | Use Case | Timeline | Automation |
|--------|----------|----------|-----------|
| **AMO Upload** (Public Listing) | Distribute to millions via Firefox Add-ons | 1-24 hours (manual review possible) | Via web interface or API |
| **AMO Upload** (Self-Distributed/"Unlisted") | Beta testing, private distribution | <24 hours (automated only) | Via web interface or API |
| **`web-ext sign`** (CLI) | CI/CD automation for self-hosted | Seconds to minutes | ✅ Full CLI support |
| **Add-on Create API (V5)** | Programmatic submission | Via API calls | ✅ Full API support |

**Self-Distribution vs. Public AMO:**
- **Public (AMO listing):** Millions of users can find and install; subject to manual review; updates handled automatically
- **Unlisted (self-hosted):** Private distribution; no AMO directory listing; you host the signed `.xpi` file; users install via direct link; only automated review

**Unsigned Extensions:**
- Cannot be installed in release/beta Firefox
- Can only be installed in Developer Edition, Nightly, ESR (after toggling `xpinstall.signatures.required`)
- Not practical for end-user distribution

---

### 2.5 LinkedIn Trademark Considerations

**Firefox/AMO Policy on Trademark Usage:**

Firefox AMO explicitly permits use of brand names in extension names **when properly formatted:**

**Approved Naming Format:**
> "Add-on name for Firefox"

Example for LinkedIn:
- ✅ "Feed Focuser for Firefox" (Firefox naming convention)
- ✅ "LinkedIn Feed Helper for Firefox" (includes both brand names correctly)

**Regarding LinkedIn Specifically:**

Mozilla's policy allows brand names in extension names if:
1. Your add-on icon and name do NOT suggest it's published/endorsed/affiliated by LinkedIn
2. You use the brand name only to describe functionality
3. Your branding clearly denotes your own unique identity

**Recommended Approach for LinkedIn:**

✅ **GOOD:**
- "LinkedIn Feed Focuser for Firefox"
- "Feed Focus for LinkedIn"
- "LinkedIn Feed Helper"
- "Focus - LinkedIn Feed Tool"

❌ **AVOID:**
- "LinkedIn Official Feed Helper" (sounds official)
- "By LinkedIn" (false affiliation)
- "LinkedIn (Endorsed)" (false endorsement)

**Key Differences from Chrome:**
- **Chrome:** Very restrictive; trademark complaints result in removal; "for Brand" format is borderline
- **Firefox/AMO:** More lenient; explicitly allows brand names if used descriptively and without suggesting affiliation

**Description Disclaimer:**
Include in your add-on description:
> "This is an unofficial third-party tool designed to work with LinkedIn. It is not affiliated with, endorsed by, or associated with LinkedIn Corporation or its subsidiaries."

**LinkedIn's Own Policy on Your Extension:**
LinkedIn's ToS still prohibits browser extensions that modify or automate activity on LinkedIn. Risk level:
- Low: Extension uses heuristics only, does not inject automation scripts, does not modify LinkedIn's UI beyond hiding elements
- Medium: Extension modifies feed appearance significantly
- High: Extension includes automation or data scraping

Your Feed Focuser (heuristic-based filtering only) is low-risk from LinkedIn's standpoint, but they may still attempt to detect and block it.

**Reference:** https://extensionworkshop.com/documentation/publish/add-on-policies/

---

### 2.6 Privacy Policy & Compliance

**Required Privacy Policy Contents:**

```
Feed Focuser Privacy Policy

Last Updated: [Date]

1. Data Collection
   - User's feed filter preferences (stored in browser)
   - Last timestamp of filter application (stored locally)
   - No personal information collected
   - No tracking, analytics, or telemetry

2. Data Storage
   - All data stored locally in browser via browser.storage API
   - No external servers receive user data
   - Data persists until user clears browser data or uninstalls extension

3. Data Sharing
   - No third-party data sharing
   - No external API calls beyond LinkedIn's public site

4. Permissions Justification
   - storage: Store user preferences locally
   - tabs: Detect when user navigates to LinkedIn feed
   - scripting: Inject content script to identify feed elements
   - host_permissions (*://*.linkedin.com/*): Access LinkedIn feed DOM

5. User Control
   - Users can clear stored data via browser settings
   - Users can disable extension at any time
   - No account or login required
```

**Hosting & Availability:**
- Must be hosted on publicly accessible URL
- Must remain live for extension's lifespan
- Provide URL in AMO submission form

---

### 2.7 Permissions & Justification

Your extension requires these permissions. **Each needs clear justification in AMO reviewer notes.**

**Required Permissions:**

| Permission | Purpose | Justification |
|-----------|---------|---------------|
| `storage` | Store user's filter preferences locally | Persist feed filtering settings across sessions |
| `tabs` | Detect LinkedIn feed navigation | Determine when to apply feed filters |
| `scripting` | Inject content script into LinkedIn pages | Identify and hide non-focused feed items |
| `*://*.linkedin.com/*` | Host permission for LinkedIn access | Access LinkedIn feed DOM to apply filtering |

**Permissions Justification Note (include in submission):**
> "Feed Focuser uses minimal permissions:
> - storage: To save user's feed filter settings and preferences
> - tabs: To detect when user visits LinkedIn feed pages
> - scripting: To inject filtering logic into LinkedIn's feed
> - host_permissions: Limited to *.linkedin.com/* to apply filters
> 
> No data is collected, sent to external servers, or used for tracking."

---

### 2.8 CI/CD Automation (Firefox AMO Publishing)

**Official APIs:**
- **Add-on Create API (V5):** Recommended for full automation
- **Signing API (V4):** For self-hosted signing
- **web-ext CLI:** Community tool for signing and submission

**Authentication (API V5):**
1. Generate API key and secret in AMO Developer Hub
   - Go to https://addons.mozilla.org/developers/
   - Click "Manage API Keys"
   - Create new API key
2. Store as GitHub secrets:
   - `AMO_API_KEY`
   - `AMO_API_SECRET`

**Key Endpoints:**
```
GET/PATCH https://addons.mozilla.org/api/v5/addons/{addon-id}/
POST https://addons.mozilla.org/api/v5/addons/upload/
```

**Recommended Tools:**

| Tool | Type | Status | API Support |
|------|------|--------|------------|
| [web-ext](https://github.com/mozilla/web-ext) (CLI) | Command-line tool | ✅ Official Mozilla | Signing only (V4 API) |
| [semantic-release-amo](https://github.com/iorate/semantic-release-amo) | semantic-release plugin | ✅ Maintained | Full API (V5) |
| [release-firefox-addon](https://github.com/browser-actions/release-firefox-addon) | GitHub Action | ✅ Maintained | Full API (V5) + JWT auth |
| [web-ext Action](https://github.com/marketplace/actions/web-ext-action-for-firefox-add-ons) | GitHub Action | ✅ Maintained | web-ext CLI wrapper |

**Example GitHub Actions Workflow (using release-firefox-addon):**

```yaml
name: Publish to Firefox AMO

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build extension
        run: npm run build
      
      - name: Publish to Firefox AMO
        uses: browser-actions/release-firefox-addon@v1
        with:
          addon-guid: feedfocuser@thevgergroup.com
          xpi-path: dist/extension.xpi
          amo-api-key: ${{ secrets.AMO_API_KEY }}
          amo-api-secret: ${{ secrets.AMO_API_SECRET }}
```

**Alternative: web-ext CLI for Self-Hosted Signing:**

```bash
npx web-ext sign \
  --api-key "$AMO_API_KEY" \
  --api-secret "$AMO_API_SECRET" \
  --channel unlisted
```

**Secret Setup:**
1. Generate API Key from AMO Developer Hub
2. Add `AMO_API_KEY` and `AMO_API_SECRET` as GitHub secrets
3. Add `ADDON_GUID` (from manifest's browser_specific_settings.gecko.id) as GitHub secret

**Reference:** https://addons.mozilla.org/en-US/developers/docs/topics/api

---

## 3. Comparative Summary

| Aspect | Chrome Web Store | Firefox AMO |
|--------|-----------------|------------|
| **Registration Cost** | $5 one-time | Free |
| **Manifest Support** | V3 only | V2 or V3 |
| **Review Timeline** | 2-14 business days | 1-48 hours (usually <24h) |
| **Trademark Policy** | Very restrictive; "for Brand" risky | Lenient; explicitly allows brand names if descriptive |
| **Signing Required** | No (auto-signed) | Yes, mandatory for all |
| **Self-Distribution** | Not available | Yes (unlisted/self-hosted) |
| **Automation API** | ✅ Official API (v2) | ✅ Official API (v5) + CLI |
| **CI/CD Maturity** | Mature (Google tools available) | Mature (multiple community tools) |
| **Obfuscated Code** | Not allowed | Allowed if source code provided |
| **Privacy Policy** | Required | Required |
| **LinkedIn Trademark Risk** | HIGH (enforcement aggressive) | MEDIUM (more lenient policy) |

---

## 4. Recommended Deployment Strategy

### Phase 1: Chrome Web Store (Primary)
1. **Prepare:** Create manifest V3, build, test locally
2. **Store Listing:** Write clear name ("Feed Focuser for LinkedIn"), neutral description (emphasize "unofficial")
3. **Compliance:** Create privacy policy URL, ensure all permissions justified
4. **Submit:** Upload to Chrome Web Store
5. **Review:** Wait 2-14 days; address feedback if rejected
6. **Publish:** Once approved, extension is live to Chrome users
7. **Automate:** Set up GitHub Actions with cws-publish for future updates

### Phase 2: Firefox AMO (Secondary)
1. **Prepare:** Ensure Manifest V3 compatibility; add browser_specific_settings with gecko.id
2. **Store Listing:** Name ("LinkedIn Feed Focuser for Firefox"), include disclaimer
3. **Submit:** Upload to AMO (choose Public listing for max reach)
4. **Review:** Wait up to 24 hours; typically much faster than Chrome
5. **Sign:** Mozilla signs extension automatically
6. **Publish:** Extension is live once signed
7. **Automate:** Set up GitHub Actions with release-firefox-addon for future updates

### Phase 3: Self-Hosted Backup (Optional)
- Keep unlisted/self-hosted versions signed and ready
- Useful if either store removes extension
- Can serve directly to users via your website

---

## 5. Trademark & Legal Risk Assessment

**Risk Factors for Feed Focuser:**

| Risk | Severity | Mitigation |
|------|----------|-----------|
| LinkedIn detection & blocking | HIGH | Use heuristics only; avoid hardcoded selectors; no automation scripts |
| LinkedIn ToS violation notice | MEDIUM | Clear "unofficial" disclaimer; do not scrape data; do not modify LinkedIn's UI |
| Trademark complaint to Chrome | MEDIUM | Use neutral branding; avoid LinkedIn colors; use "for LinkedIn" phrasing |
| Trademark complaint to Firefox | LOW | Firefox's policy explicitly allows brand names; clear disclaimer sufficient |
| User account restriction | MEDIUM | Educate users that LinkedIn ToS prohibits extensions; accept liability |

**Recommended Disclaimers:**

In Chrome Web Store listing:
> "Feed Focuser is an unofficial, third-party tool that works with LinkedIn's web interface. It is not affiliated with, endorsed by, or authorized by LinkedIn Corporation. Use at your own risk; LinkedIn's Terms of Service prohibit browser extensions, and accounts detected using such tools may be restricted or suspended."

In Firefox AMO listing:
> "This is an unofficial third-party extension designed to help users focus their LinkedIn feed. It is not affiliated with or endorsed by LinkedIn Corporation. Please review LinkedIn's Terms of Service before using this extension."

---

## 6. Key Development Checklist

### Before First Submission:

**Manifest & Code:**
- [ ] Manifest V3 format (Chrome) or V3 with gecko.id (Firefox)
- [ ] No obfuscated code (Chrome); minified source provided (Firefox)
- [ ] Permissions minimized: only `storage`, `tabs`, `scripting`, host permission for linkedin.com
- [ ] All permissions justified in comments and store listing
- [ ] No remote code execution
- [ ] Extension has single, clearly-defined purpose

**Store Listings:**
- [ ] Icon: 128x128 PNG, neutral branding (not LinkedIn colors)
- [ ] 3-5 screenshots showing actual filtering in use
- [ ] Name: "Feed Focuser" (both Chrome and Firefox — no LinkedIn trademark)
- [ ] Short description: 50-132 characters, describes what it filters (no LinkedIn in name)
- [ ] Detailed description: clear purpose, key features, disclaimer ("not affiliated with LinkedIn")
- [ ] Support email: hello@thevgergroup.com
- [ ] Homepage URL: https://github.com/pjaol/feed_focuser
- [ ] Privacy policy URL: https://thevgergroup.com/privacy-policy/

**Privacy & Compliance:**
- [ ] Privacy policy created and hosted (see section 2.6)
- [ ] No data collection beyond local preferences
- [ ] No external API calls or telemetry
- [ ] No tracking or analytics
- [ ] Clear user control (delete data anytime)

**Testing:**
- [ ] Extension loads without errors in Chrome/Firefox
- [ ] Feed filtering works as intended
- [ ] No console errors or warnings
- [ ] Permissions work correctly
- [ ] Storage persists across sessions
- [ ] Extension handles LinkedIn DOM variations gracefully

**Legal:**
- [ ] Trademark disclaimer in store listing (required)
- [ ] License selected (MIT, GPL, etc.)
- [ ] Terms of Service clause acknowledging LinkedIn ToS risks (optional but recommended)

---

## 7. Resources & Official Documentation

### Chrome Web Store
- Developer Dashboard: https://chrome.google.com/webstore/developer/dashboard
- Extension Policy: https://developer.chrome.com/docs/webstore/program-policies/policies
- Trademark Policy: https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property
- API Documentation: https://developer.chrome.com/docs/webstore/using-api
- Branding Guidelines: https://developer.chrome.com/docs/webstore/branding

### Firefox AMO
- Developer Hub: https://addons.mozilla.org/developers/
- Submission Guide: https://extensionworkshop.com/documentation/publish/submitting-an-add-on/
- Signing & Distribution: https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/
- Add-on Policies: https://extensionworkshop.com/documentation/publish/add-on-policies/
- API Documentation: https://addons.mozilla.org/en-US/developers/docs/topics/api

### LinkedIn Legal
- User Agreement: https://www.linkedin.com/legal/user-agreement
- Prohibited Software: https://www.linkedin.com/help/linkedin/answer/a1341387
- Trademark Policy: https://www.linkedin.com/help/linkedin/answer/a1337296/linkedin-s-trademark-policy
- Brand Guidelines: https://brand.linkedin.com/

---

**Document Version:** 1.0  
**Last Reviewed:** July 2026  
**Status:** Ready for submission
