## 2024-05-14 - Fix Path Traversal in File Saving and CLI Inputs

**Vulnerability:** Unsanitized CLI inputs (`option`, `yearOrDecade`) were used to construct the output filename in `src/index.ts`, and this string was directly appended to the output directory path in `src/output.ts` without sanitization. An attacker could provide a payload like `../../../etc/passwd` to traverse outside the intended output directory.
**Learning:** Using untrusted/unsanitized input directly into file paths always poses a risk, even if the application is intended to be run locally via CLI by a human. The CLI parameters themselves can be dangerous.
**Prevention:** Two layers of defense were added. First, user inputs in `src/input.ts` are strongly typed and validated (e.g., restricted to specific values like `popular`, `year`, `decade`, and constrained to 4-digit numeric formats). Second, the file path constructed in `src/output.ts` explicitly uses `path.basename()` as defense-in-depth to guarantee path segments cannot traverse directories.

## 2024-05-15 - Fix SSRF and LFI via Unsanitized External URLs in Scraper

**Vulnerability:** The scraper extracted URLs containing `imdb.com/title` from Letterboxd pages without validating the scheme or actual domain. This meant if a malicious user added a link like `http://127.0.0.1:8080/internal-api?x=imdb.com/title/` or `file:///etc/passwd?x=imdb.com/title/` to a review on Letterboxd, the headless browser would navigate to it, leading to Server-Side Request Forgery (SSRF) and Local File Inclusion (LFI).
**Learning:** Web scrapers navigating to URLs extracted from external, user-controllable sites (even indirectly via scraping another service) must rigorously validate the target URL. Unvalidated external links are untrusted input that can trick the scraper's browser context into attacking internal networks or reading local files.
**Prevention:** Always use a URL parser (like the `URL` constructor) to validate extracted links before navigation. Explicitly allow only safe protocols (`http:`, `https:`) and verify the exact `hostname` matches the expected external domain (e.g., `imdb.com` or `www.imdb.com`) rather than just checking if a substring exists anywhere in the URL string.

## 2024-03-27 - Prevent SSRF/LFI with strict URL and schema validation before external navigation

**Vulnerability:** The scraper navigates directly to URLs built from or scraped as inputs via `page.goto()`. Before, there was no protection against an attacker specifying or a page providing a malicious scheme (like `file://`) or an unexpected domain, which could lead to Local File Inclusion (LFI) or Server-Side Request Forgery (SSRF).
**Learning:** We need strict, centralized validation of the protocol schema (`http:` or `https:`) and the allowed domain directly prior to calling `page.goto()`. While some domain-specific scraping methods had informal checks, they weren't robust or reusable across all navigation actions.
**Prevention:** Implement a `validateSafeUrl(url, allowedDomain)` utility utilizing the native `URL` constructor to enforce an explicit allowlist on `protocol` and `hostname`. Always invoke this before any unverified `page.goto()` navigation.

## 2024-05-16 - Prevent CSV Formula Injection from scraped data

**Vulnerability:** Scraped text for movie titles and directors was placed directly into CSV output. If a user maliciously creates a Letterboxd profile or movie with a title starting with special characters like `=`, `+`, `-`, or `@`, spreadsheet software like Excel could execute it as a formula upon opening the CSV.
**Learning:** Even though the source (Letterboxd) might seem safe, the underlying data is essentially untrusted user input. Any text exported to a structured format like CSV can become an execution vector in the consumer's local environment.
**Prevention:** Added a `sanitizeCsvField` method in the storage layer that prepends a single quote (`'`) to any string starting with formula-trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) before saving to CSV.
