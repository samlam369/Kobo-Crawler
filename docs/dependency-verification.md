# Dependency remediation verification

Verified on 2026-10-09 (Asia/Hong_Kong), following the [Dependabot analysis](dependabot-analysis.md). This report records local verification; the initial analysis remains a historical snapshot.

## Changes and environment

- The sole direct dependency is `selenium-webdriver ^4.50.0`. Unused `chromedriver`, `geckodriver`, `save`, direct `tar-fs`, and the npm-ineffective `resolutions` entry were removed.
- The lockfile resolves Selenium `4.50.0`, `ws 8.22.0`, and `tmp 0.2.7`. Node.js `>=22` is declared and documented; Jenkins now uses `npm ci`.
- Local environment: Windows, Node.js `26.4.0`, npm `11.4.2`, installed Chrome `154.0.8037.98`. ChromeDriver was not on `PATH`; no proxy or `SE_*` environment variables were initially configured.

## Results

| Check | Evidence | Result |
|---|---|---|
| Reproducible installation | `npm ci` completed with exit 0; lockfile SHA-256 stayed `E9970CBAD518ACC1F5A5FCB9112BFC92686E51736DB23652ED30B3C356662FF8` | Pass |
| Known npm vulnerabilities | `npm audit --json` completed with exit 0 and zero vulnerabilities | Pass |
| Lockfile integrity | Root dependency/engine entries match the manifest; `axios`, `basic-ftp`, `extract-zip`, `ip-address`, `follow-redirects`, and `form-data` are absent; `ws` and `tmp` are at patched versions | Pass |
| Fresh Selenium Manager cache | With `SE_CACHE_PATH` pointing to a newly created temporary directory, `Builder().forBrowser('chrome').build()` downloaded ChromeDriver `154.0.8037.92` and launched installed Chrome `154.0.8037.98` | Pass |
| Browser integration | A temporary headless smoke script asserted a local page title and DOM text, then the title of `https://example.org`; `driver.quit()` completed | Pass |
| Node.js 22 integration | The same browser smoke script passed under isolated Node.js `22.23.3`, using the previously downloaded driver | Pass |
| Chrome path configuration | Installed Selenium Manager `0.4.50` honored `SE_CHROME_PATH`; an invalid path produced the matching warning, and the valid installed path resolved the cached driver | Pass |
| Live crawler | Unmodified `node dothething.js` visited Kobo, found the 10/8-10/14 weekly post, visited all eight book pages, printed eight deals with eight nonempty Book IDs, and exited 0 with `Job finished successfully.` | Pass |
| Session cleanup | The crawler logged its final quit; smoke sessions quit successfully; no `chromedriver.exe` process remained after verification | Pass |

The live output was parsed as JSON and checked for eight records, string fields (`date`, `title`, `author`, `salesCopy`, `link`, `bookCover`, `isbn`), nonempty Book IDs, and Kobo HTTPS book URLs. No TLS checks were disabled, no production parser was changed, and no synthetic data substituted for Kobo results.

Raw smoke/crawler logs and parsed live data were retained locally in `%TEMP%/kobo-selenium-verification-4976e116aa394d84a9d2194cb13895d6`; these temporary files are not repository artifacts. The smoke assertions are described here so the evidence remains understandable if temporary files are later removed.

## Limits and follow-up

- The Jenkins host, its installed Node.js/Chrome versions, network/proxy, cache permissions, and graphical session were not accessible. Local Windows success does not certify that separate Linux agent. Its first run needs access to Selenium Manager's version metadata and driver downloads, plus a writable cache.
- Live extraction succeeded, but this check does not certify every data-normalization rule. Existing dates such as `2026-10-8 ` contain trailing whitespace and an unpadded day; this unrelated parser behavior was left unchanged.
- The pre-existing `npm test` script remains a placeholder that intentionally exits 1. Validation used explicit installation, dependency, browser, and crawler checks instead.
- Zero audit findings mean no known advisories in the queried npm database at verification time. GitHub Dependabot alerts are not closed by a local edit; their status must be rechecked after the updated lockfile reaches the default branch.

Final tracked change summary at verification: four files, 42 insertions and 1,334 deletions; mostly removal of unused dependency chains. `git diff --check` passed. `dothething.js` was unchanged. The analysis, advisory notes, and this verification report are untracked documentation additions pending the user's normal commit workflow.
