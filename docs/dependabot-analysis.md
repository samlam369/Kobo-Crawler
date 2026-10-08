# Dependabot alerts 分析

查核日期：2026-10-09。範圍：`samlam369/Kobo-Crawler` 嘅 GitHub 未關閉 Dependabot alerts、`main` 嘅依賴鎖定版本、實際程式碼同 npm registry。呢次只做分析，冇改依賴、執行安裝 scripts、dismiss alerts 或建立 PR.

## 結論

目前有 **46 個未關閉 alerts: 1 個 Critical, 21 個 High, 23 個 Medium, 1 個 Low**。全部喺 `package-lock.json`, 都係間接依賴。**43 個由 `chromedriver` 帶入，另外 3 個由 `selenium-webdriver` 帶入**。數量反映漏洞公告數目，唔代表有 46 條可直接攻擊 crawler 嘅路徑。

最值得先處理係 `chromedriver` 安裝時下載同解壓 ZIP 嘅流程。`extract-zip` 有 2 個 High alerts, 官方公告暫時冇修補版本。Crawler 本身只 import Selenium, 冇直接 import `chromedriver`. 建議先驗證可否移除 npm `chromedriver`, 改由 Selenium Manager 管理 driver, 再更新 Selenium 同鎖定檔。

## 依賴同修補版本

以下修補下限只涵蓋呢次查到嘅未關閉 alerts, 唔係永久安全保證，跨 major 升級亦要驗證相容性。

| 套件 | 鎖定版本 | Alerts | 涵蓋本次 alerts 嘅修補下限 | 引入路徑 |
|---|---|---:|---|---|
| `axios` | `1.12.2` | 29 | `1.20.0` | `chromedriver` |
| `basic-ftp` | `5.0.5` | 5 | `6.2.1` | `chromedriver → proxy-agent → pac-proxy-agent → get-uri` |
| `extract-zip` | `2.0.1` | 2 | 暫時冇 | `chromedriver` |
| `ip-address` | `9.0.5` | 5 | `10.7.1` | `chromedriver → proxy-agent → socks-proxy-agent → socks` |
| `follow-redirects` | `1.15.9` | 1 | `1.16.0` | `chromedriver → axios` |
| `form-data` | `4.0.4` | 1 | `4.0.6` | `chromedriver → axios` |
| `tmp` | `0.2.5` | 1 | `0.2.6` | `selenium-webdriver` |
| `ws` | `8.18.1` | 2 | `8.21.0` | `selenium-webdriver` |

完整逐項公告、編號同連結見 [advisory notes](dependabot-advisory-notes.md)。

## 實際影響同優先次序

1. **優先處理 ZIP 解壓寫檔漏洞：#51 / #52。** `chromedriver@134.0.1` 嘅 `install.js` 會下載 driver ZIP, 再用 `extract-zip` 解壓。攻擊者如果控制下載來源、鏡像或本地指定 ZIP, 可以藉 symlink entry 喺解壓目錄以外寫檔。Jenkins 每次執行 `npm install`, 呢條路徑會喺需要下載或重新解壓 driver 時執行。一般 Kobo 頁面內容唔會直接變成呢度嘅 ZIP. 最新 `chromedriver@155.0.0` 已改用 `adm-zip`, 可以移除呢兩個已知 alerts, 但仍有其他未修補依賴。
2. **更新下載器嘅 HTTP 依賴：`axios` / `follow-redirects`。** Axios 係 driver 安裝器用嚟 GET 版本資料同下載檔案，唔係 crawler 用嚟讀 Kobo HTML. Proxy/redirect 憑證洩漏要符合實際 proxy、header 同 redirect 條件；prototype pollution 類公告需要先有另一個同 process 嘅污染來源。冇見到 repo 將外部 JSON 直接當 Axios config, 或用 fetch adapter / multipart upload. 所以唔應該將全部 29 個 Axios alerts 描述成 crawler 可以直接被攻擊，但下載回應、proxy 同 redirect 仍值得處理。安裝器使用 streamed download, 冇見到明確有限嘅下載大小上限。
3. **分開判斷 FTP 嘅 Critical 同 DoS。** [#8](https://github.com/samlam369/Kobo-Crawler/security/dependabot/8) 係 `downloadToDir()` path traversal. 即時上游 `get-uri@6.0.4` 只用 `downloadTo(stream, filepath)`, 冇用 `downloadToDir()`, 所以喺已檢查路徑冇見到 Critical 寫檔漏洞可達。另一方面，FTP PAC URL 嘅 metadata fallback 會調用 `list()`, 因而 [#57](https://github.com/samlam369/Kobo-Crawler/security/dependabot/57) 同 #16 嘅 CPU / 記憶體 DoS 仍可能喺使用 FTP PAC 同惡意 FTP server 嘅條件下觸發；#27 涉及控制回應 buffering, #10 涉及可控 credentials. 冇理由只因為 Critical 唔可達，就當整個 FTP 依賴鏈安全。
4. **更新 Selenium 嘅 `ws` / `tmp`。** `dothething.js` 冇啟用 BiDi / CDP WebSocket, 亦冇將外部輸入傳入 temp prefix / postfix; 呢啲係降低可利用性嘅證據。兩者更新都可以留喺現有 major 範圍：`ws >=8.21.0`, `tmp >=0.2.6`. 唔需要等到發現直接攻擊路徑先修補。
5. **`ip-address` 主要係 SOCKS proxy 路徑。** Repo 冇自建 IP allowlist、subnet check 或輸出 IP diagnostic HTML. 公告所指嘅 XSS / allowlist bypass 並非現時 crawler 嘅功能；長字串解析 DoS 仍要按 proxy 輸入來源判斷。經更新 `socks` 可引入已修補嘅 `ip-address@10.7.3`, 避免直接強制跨 major override 舊上游。

## 修復方案驗證

喺 repo 以外嘅臨時目錄，用新 manifest 執行 `npm install --package-lock-only --ignore-scripts` 同 `npm audit --json`. 冇啟動 crawler, 冇驗證 browser / Jenkins 相容性；以下係新解析依賴圖嘅結果。

| 方案 | 實際解析結果 | npm audit 結果 |
|---|---|---|
| 重新解析現有 manifest 範圍 | `chromedriver 134.0.5`, `selenium-webdriver 4.50.0`, `axios 1.20.0`, `basic-ftp 5.3.1` | 6 個 High 套件節點，仍有 `extract-zip` 同 FTP DoS |
| 保留 driver 套件並更新 | `chromedriver 155.0.0`, `selenium-webdriver 4.50.0`, `basic-ftp 5.3.1` | 5 個 High 套件節點，都源自 FTP DoS 同上游傳播 |
| 只保留 Selenium | `selenium-webdriver 4.50.0`, `ws 8.22.0`, `tmp 0.2.7` | **0 個已知漏洞** |

`npm audit` 嘅套件節點數唔等於 Dependabot 公告數：佢會將受影響上游套件一齊計。原本鎖定檔嘅 audit 係 11 個節點，包括 Dependabot 未列出嘅 `sprintf-js` [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)。移除 `chromedriver` 依賴鏈亦會移除呢個套件。

**建議採用只保留 Selenium 嘅方向，但先完成以下驗證：**

- 確認 Jenkins / 實際執行環境嘅 Node.js 版本；`selenium-webdriver@4.50.0` 同 `chromedriver@155.0.0` 都要求 Node.js `>=22`. 原本 Selenium 只要求 `>=18.20.5`.
- 依賴清理：程式碼只 import Selenium; `geckodriver`, `save`, 直接 `tar-fs` 都冇喺 repo 程式碼使用。先確認外部 jobs 冇依賴呢啲套件，再移除。
- 驗證 Selenium Manager 可取得適配已安裝 Chrome 嘅 driver, 包括 Jenkins 嘅網絡、proxy、cache 同權限。目前 Selenium `4.29.0` 已有呢個 fallback, 所以移除 npm driver 有現成機制可用，但唔代表離線環境一定成功。
- 更新同提交 manifest / lockfile, 用 `npm ci` 驗證，再做 Chrome 啟動、實際 Kobo 抓取同退出流程 smoke test. 完成後將 Jenkins 安裝步驟由 `npm install` 改成 `npm ci`, 令安裝依鎖定檔重現。

如果必須保留 npm driver, 要另外處理 `get-uri → basic-ftp` 嘅 major 限制：即使最新 `get-uri@8.0.1` 仍要求 `basic-ftp ^5.3.1`, 無法自然取得 `6.2.1` 嘅修補。可以考慮相容性已驗證嘅 scoped override 或上游修復，唔好直接照 `npm audit fix --force` 嘅建議行事；臨時測試甚至提出將最新版 driver 降去 `122.0.1`, 唔適合作為 browser 相容性方案。

`package.json` 嘅 `resolutions` 唔係 npm 原生 override 機制，唔應該依賴佢約束整條依賴鏈。現有 `tar-fs` 修補亦唔會解決呢次另外 8 個套件嘅 alerts.

## 證據同限制

- [GitHub Dependabot alerts](https://github.com/samlam369/Kobo-Crawler/security/dependabot) / [REST API](https://docs.github.com/en/rest/dependabot/alerts#list-dependabot-alerts-for-a-repository)：透過已登入 `gh api` 取得所有 open alerts.
- 本地 `package-lock.json` 同 GitHub `main` 嘅 blob SHA 都係 `e0be626dda5f4a57d48a8a72f72e04e968f40d78`; 依賴鏈亦用 `npm ls --all` 核對。
- Repo 原始碼：[package.json](../package.json)、[dothething.js](../dothething.js)、[Jenkinsfile](../Jenkinsfile)。
- 官方發佈套件原始碼：`chromedriver@134.0.1/install.js`, `get-uri@6.0.4/dist/ftp.js`, `selenium-webdriver@4.29.0/chromium.js` 同 `common/driverFinder.js`。
- 套件 metadata / 發佈依賴：[chromedriver registry](https://registry.npmjs.org/chromedriver/latest)、[Selenium registry](https://registry.npmjs.org/selenium-webdriver/latest)、[get-uri registry](https://registry.npmjs.org/get-uri/latest)。
- npm override 語義：[package.json overrides](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#overrides)。Selenium driver 管理：[Selenium Manager](https://www.selenium.dev/documentation/selenium_manager/)。

實際 Jenkins 配置、外部 scripts、proxy 環境同 driver cache 未有驗證；低可利用性判斷只適用於已檢查嘅 repo 程式碼。零 audit 結果亦只代表查核當時 npm advisory database 冇報已知漏洞。

## 後續修復

2026-10-09 按上述方向更新本地程式庫：移除 npm driver 同未使用依賴，升級 Selenium, 宣告 Node.js `>=22`, 並將 Jenkins 安裝改為 `npm ci`. 安裝同 audit 通過，亦已驗證全新 Selenium Manager cache 嘅 driver 下載、Chrome 啟動、Node.js 22 相容性，以及實際 Kobo 抓取 8 本書同正常退出。完整證據同 Jenkins 驗證限制見 [dependency verification](dependency-verification.md)。上文嘅「未改依賴」同 alerts 數目保留為初次分析時嘅快照。
