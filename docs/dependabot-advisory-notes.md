# Dependabot advisory 補充分析

核對日期：2026-10-09。資料來自 GitHub Dependabot API 嘅 46 個 open alerts, 同 `package-lock.json` 鎖定版本嘅 npm 發佈原始碼。嚴重程度係 advisory 評級；以下另外區分實際呼叫路徑同利用前提。未執行惡意 payload.

## `extract-zip`: #51 / #52 需要移除或替換依賴

兩個 advisory 都涵蓋 `extract-zip <= 2.0.1`, GitHub 嘅 `first_patched_version` 都係 `null`; npm 最新版本仍然係 `2.0.1`. 單純重新產生 lockfile 或將版本升到最新，唔會解決呢兩個 alerts. [#51](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) / [#52](https://github.com/advisories/GHSA-7pqw-9j4j-h8q3) / [npm metadata](https://registry.npmjs.org/extract-zip/latest)

#51 指未驗證 symlink 嘅 target, 會建立指向解壓目錄以外嘅 link; 後續讀寫能否越界視乎使用方法。#52 係更直接嘅任意檔案寫入：ZIP 先放一個指向目錄外嘅 symlink, 再放同名普通檔案，寫入就會跟隨 symlink. 兩者相關，但唔應當成同一個 alert 重複計算。[advisories](https://github.com/advisories/GHSA-7pqw-9j4j-h8q3)

已核對 npm 發佈嘅 `extract-zip@2.0.1/index.js`: 第 58 行只檢查 entry 嘅父目錄 realpath; 第 130 行直接 `fs.symlink(link, dest)`; 第 132 行用 `createWriteStream(dest)` 寫普通檔案。呢個實作同兩個 advisory 描述一致。[發佈原始碼](https://registry.npmjs.org/extract-zip/-/extract-zip-2.0.1.tgz)

本 repo 嘅 `chromedriver@134.0.1/install.js` 第 377 行確實呼叫 `extractZip(...)`, 所以係安裝時可到達嘅解壓路徑。利用仍需要惡意 ZIP: 例如下載來源、mirror、代理或供應鏈被控制。預設 CDN 係 Google 域名，但 `CHROMEDRIVER_CDNURL` 等環境設定可以更改來源。升級 `chromedriver` 要確認新依賴已移除 `extract-zip`, 或驗證可完全移除 `chromedriver` 套件；另一個 ZIP 套件唔可直接當成相容 override, 因為 API 同安全行為未必一致。[發佈原始碼：第 27 / 28 / 377 行](https://registry.npmjs.org/chromedriver/-/chromedriver-134.0.1.tgz)

## `basic-ftp`: Critical #8 同其他 DoS 要分開判斷

#8 嘅任意檔案覆寫需要 `downloadToDir()` 接收惡意 FTP directory listing. 修正版本係 `5.2.0`. 本 repo 嘅直接 consumer 係 `get-uri@6.0.4`; 已核對 `dist/ftp.js`, 第 73 行只呼叫 `downloadTo(stream, filepath)`, 冇呼叫 `downloadToDir()`. 所以喺呢條鎖定依賴路徑，未見 #8 嘅漏洞方法可到達。呢個係降低實際優先次序嘅理由，唔代表整個 `basic-ftp` 冇風險。[#8 advisory](https://github.com/advisories/GHSA-5rq4-664w-9x2c) / [get-uri 發佈原始碼](https://registry.npmjs.org/get-uri/-/get-uri-6.0.4.tgz)

`get-uri` 如果 `lastMod()` 未取得時間，第 55 行會 fallback 到 `client.list(...)`; 所以 #16 / #57 嘅 LIST 記憶體 / CPU DoS 仍然有條件可到達。#27 嘅 multiline control-response 緩衝問題亦唔要求 `downloadToDir()`. #10 涉及 FTP login credentials / command injection, `get-uri` 會 decode URL 嘅 username / password 再傳畀 `client.access()`. 但呢啲都需要走到 FTP URI 路徑，例如 FTP 提供嘅 PAC proxy 設定；唔應描述成一般 HTTPS ChromeDriver ZIP 下載就直接觸發。[#16](https://github.com/advisories/GHSA-rp42-5vxx-qpwr) / [#57](https://github.com/advisories/GHSA-c475-qrg2-pj4r) / [#27](https://github.com/advisories/GHSA-rpmf-866q-6p89) / [#10](https://github.com/advisories/GHSA-6v7q-wjvx-w8wg)

#57 嘅第一個修正版係 `6.2.1`, 但 `get-uri@6.0.4` 宣告 `basic-ftp ^5.0.2`; 強制 override 到 6.x 超出原本 major range. 優先升級上游依賴鏈，再檢查下載 / proxy 相容性，唔好聲稱升到 5.3.1 已解決所有 alerts. [npm metadata](https://registry.npmjs.org/get-uri/6.0.4) / [#57](https://github.com/advisories/GHSA-c475-qrg2-pj4r)

## `axios`: 多個 alerts 有額外前提

鎖定版本係 `1.12.2`. `chromedriver` 喺安裝時用自行組裝嘅 GET options 下載 metadata / binary; binary 下載設定 `responseType: 'stream'`. 冇發現指定 fetch adapter、multipart upload 或有限 `maxContentLength` 設定。Axios 嘅預設 adapter 次序係 `xhr`, `http`, `fetch`; 正常 Node 環境使用 HTTP adapter. [chromedriver 原始碼：第 227 / 328 行](https://registry.npmjs.org/chromedriver/-/chromedriver-134.0.1.tgz) / [axios 原始碼：lib/defaults/index.js 第 40 行](https://registry.npmjs.org/axios/-/axios-1.12.2.tgz)

- #56 明確要求 fetch adapter + 先存在另一個 prototype-pollution 漏洞 + array / class-instance body; 預設 Node GET 下載唔符合。#35 / #45 同樣限制 fetch adapter, 唔可因為有 Axios 就斷言呢個 downloader 可利用。[#56](https://github.com/advisories/GHSA-4hqw-qxg8-jxx2) / [#35](https://github.com/advisories/GHSA-777c-7fjr-54vf) / [#45](https://github.com/advisories/GHSA-jqh4-m9w3-8hp9)
- #49 / #48 / #43 / #41 / #39 / #34 / #29 / #28 / #23 / #20 / #19 / #15 係 prototype-pollution read-side gadgets, 需要另一處先污染 prototype. 未見本 repo 自己提供污染入口。下載器使用安全 hardcoded options 並唔足以證明全部 gadgets 無法觸發，但 alerts 數量唔等於有同樣多個獨立可利用入口。[例：#48](https://github.com/advisories/GHSA-mmx7-hfxf-jppx)
- #7 需要不受信任 JSON config 自己帶 `__proto__` key. Advisory 明確指出係 mergeConfig DoS, 唔係 Axios 自己造成 prototype pollution. 目前下載器組裝 options 嘅方式未符合前提。[#7](https://github.com/advisories/GHSA-43fc-jf86-j433)
- #22 確實涉及 downloader 使用嘅 `responseType: 'stream'`, 但漏洞係忽略已設定嘅有限 `maxContentLength`; downloader 冇設定呢個限制。所以升級修正唔等於自動加上下載容量上限。[#22](https://github.com/advisories/GHSA-vf2m-468p-8v99)
- #37 / #38 要經有 credentials 嘅 HTTP proxy, 再 redirect 去唔經 proxy 嘅 origin. 預設 HTTPS 路徑由 `ProxyAgent` 處理，並設定 `options.proxy = false`; 唔應直接套用 Axios 自己 `config.proxy` 嘅 credential-leak 情境。#14 亦要有自訂 authentication header + 跨域 redirect; 目前 downloader 只設定 User-Agent. [#37](https://github.com/advisories/GHSA-p92q-9vqr-4j8v) / [#38](https://github.com/advisories/GHSA-j5f8-grm9-p9fc) / [#14](https://github.com/advisories/GHSA-r4q5-vmmm-2653)

部分 advisory 用廣泛嘅「all Axios users」或「all versions」字眼，但同一紀錄嘅技術段落 / vulnerability range 有更窄前提。判斷應以 affected range 同具體 source-to-sink 為準。例如 #35 嘅 metadata severity 係 high, 詳細影響仍然係有限 size limit + fetch adapter; #7 嘅 CWE 含 prototype pollution, 描述卻明確排除。呢啲係表述 / 分類差異，唔足以推翻 advisory. 本次冇用 PoC 實測去判定偽陽性。

## 完整 open-alert 清單

「首個修正版」係該 alert 對應嘅 vulnerable range 分支，唔保證涵蓋同套件其他 alerts. 每列 advisory link 係資料來源。

| Alert | 套件 | Severity | 首個修正版 | 摘要 / 來源 |
| --- | --- | --- | --- | --- |
| [#57](https://github.com/samlam369/Kobo-Crawler/security/dependabot/57) | basic-ftp | high | 6.2.1 | [basic-ftp: Quadratic-time CPU denial of service in Client.list() Unix directory-listing parser (RE_LINE backtracking)](https://github.com/advisories/GHSA-c475-qrg2-pj4r) |
| [#56](https://github.com/samlam369/Kobo-Crawler/security/dependabot/56) | axios | medium | 1.20.0 | [Axios: Fetch Adapter Header Injection via Inherited FormData getHeaders](https://github.com/advisories/GHSA-4hqw-qxg8-jxx2) |
| [#55](https://github.com/samlam369/Kobo-Crawler/security/dependabot/55) | ip-address | medium | 10.7.1 | [ip-address: isInSubnet() and isHostInSubnet() compare addresses of different families as if they shared an address space, allowing an allowlist check to admit an address outside its range](https://github.com/advisories/GHSA-j6r3-76f7-8jcv) |
| [#54](https://github.com/samlam369/Kobo-Crawler/security/dependabot/54) | ip-address | medium | 10.7.1 | [ip-address: Address6 builds a parse diagnostic proportional to the input with no length bound, allowing a single long string to stall or crash the process](https://github.com/advisories/GHSA-h3mg-xc3c-68pw) |
| [#53](https://github.com/samlam369/Kobo-Crawler/security/dependabot/53) | ip-address | medium | 10.5.1 | [ip-address: Address6.isLinkLocal() recognizes fe80::/64 rather than fe80::/10, allowing SSRF and trust-boundary bypass to on-link hosts](https://github.com/advisories/GHSA-rpw4-54j3-4h4q) |
| [#52](https://github.com/samlam369/Kobo-Crawler/security/dependabot/52) | extract-zip | high | 未提供 | [extract-zip allows arbitrary file writes through symlink archive entries](https://github.com/advisories/GHSA-7pqw-9j4j-h8q3) |
| [#51](https://github.com/samlam369/Kobo-Crawler/security/dependabot/51) | extract-zip | high | 未提供 | [extract-zip unvalidated symlink path traversal](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) |
| [#50](https://github.com/samlam369/Kobo-Crawler/security/dependabot/50) | ip-address | high | 10.3.1 | [ip-address: Address4 decodes leading-zero octets as decimal while resolvers decode them as octal, allowing SSRF and trust-boundary bypass](https://github.com/advisories/GHSA-mwp4-54f8-5fhr) |
| [#49](https://github.com/samlam369/Kobo-Crawler/security/dependabot/49) | axios | medium | 1.18.0 | [Axios: Nested axios option objects can consume polluted prototype values](https://github.com/advisories/GHSA-7q8q-rj6j-mhjq) |
| [#48](https://github.com/samlam369/Kobo-Crawler/security/dependabot/48) | axios | medium | 1.18.0 | [Axios: Prototype pollution gadgets can alter axios request construction](https://github.com/advisories/GHSA-mmx7-hfxf-jppx) |
| [#47](https://github.com/samlam369/Kobo-Crawler/security/dependabot/47) | axios | medium | 1.18.0 | [Axios: Excessive recursion in formDataToJSON can cause denial of service](https://github.com/advisories/GHSA-42h9-826w-cgv3) |
| [#46](https://github.com/samlam369/Kobo-Crawler/security/dependabot/46) | axios | medium | 1.18.0 | [Axios: Deep formToJSON Key Recursion Can Cause Denial of Service](https://github.com/advisories/GHSA-pmv8-rq9r-6j72) |
| [#45](https://github.com/samlam369/Kobo-Crawler/security/dependabot/45) | axios | medium | 1.18.0 | [Axios: Fetch adapter `ReadableStream` uploads bypass `maxBodyLength`](https://github.com/advisories/GHSA-jqh4-m9w3-8hp9) |
| [#44](https://github.com/samlam369/Kobo-Crawler/security/dependabot/44) | ws | high | 8.21.0 | [ws: Memory exhaustion DoS from tiny fragments and data chunks](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) |
| [#43](https://github.com/samlam369/Kobo-Crawler/security/dependabot/43) | axios | medium | 1.16.0 | [axios has DoS & Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions](https://github.com/advisories/GHSA-898c-q2cr-xwhg) |
| [#42](https://github.com/samlam369/Kobo-Crawler/security/dependabot/42) | form-data | high | 4.0.6 | [form-data: CRLF injection in form-data via unescaped multipart field names and filenames](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx) |
| [#41](https://github.com/samlam369/Kobo-Crawler/security/dependabot/41) | axios | high | 1.16.0 | [axios Vulnerable to Full Man-in-the-Middle via Prototype Pollution Gadget in `config.proxy`](https://github.com/advisories/GHSA-35jp-ww65-95wh) |
| [#39](https://github.com/samlam369/Kobo-Crawler/security/dependabot/39) | axios | high | 1.15.2 | [axios Vulnerable to Credential Theft and Response Hijacking via Prototype Pollution Gadget in Config Merge](https://github.com/advisories/GHSA-3g43-6gmg-66jw) |
| [#38](https://github.com/samlam369/Kobo-Crawler/security/dependabot/38) | axios | high | 1.16.0 | [Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection](https://github.com/advisories/GHSA-j5f8-grm9-p9fc) |
| [#37](https://github.com/samlam369/Kobo-Crawler/security/dependabot/37) | axios | high | 1.16.0 | [Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter](https://github.com/advisories/GHSA-p92q-9vqr-4j8v) |
| [#36](https://github.com/samlam369/Kobo-Crawler/security/dependabot/36) | axios | high | 1.16.0 | [Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection](https://github.com/advisories/GHSA-hfxv-24rg-xrqf) |
| [#35](https://github.com/samlam369/Kobo-Crawler/security/dependabot/35) | axios | high | 1.16.0 | [Allocation of Resources Without Limits or Throttling in Axios](https://github.com/advisories/GHSA-777c-7fjr-54vf) |
| [#34](https://github.com/samlam369/Kobo-Crawler/security/dependabot/34) | axios | medium | 1.15.1 | [Axios: Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy](https://github.com/advisories/GHSA-w9j2-pvgh-6h63) |
| [#33](https://github.com/samlam369/Kobo-Crawler/security/dependabot/33) | ws | medium | 8.20.1 | [ws: Uninitialized memory disclosure](https://github.com/advisories/GHSA-58qx-3vcg-4xpx) |
| [#32](https://github.com/samlam369/Kobo-Crawler/security/dependabot/32) | axios | high | 1.15.1 | [Axios: Incomplete Fix for CVE-2025-62718 - NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8) in Axios 1.15.0](https://github.com/advisories/GHSA-pmwg-cvhr-8vh7) |
| [#31](https://github.com/samlam369/Kobo-Crawler/security/dependabot/31) | axios | medium | 1.15.1 | [Axios: unbounded recursion in toFormData causes DoS via deeply nested request data](https://github.com/advisories/GHSA-62hf-57xw-28j9) |
| [#30](https://github.com/samlam369/Kobo-Crawler/security/dependabot/30) | tmp | high | 0.2.6 | [tmp has Path Traversal via unsanitized prefix/postfix that enables directory escape](https://github.com/advisories/GHSA-ph9p-34f9-6g65) |
| [#29](https://github.com/samlam369/Kobo-Crawler/security/dependabot/29) | axios | high | 1.15.2 | [Axios has prototype pollution read-side gadgets in HTTP adapter that allow credential injection and request hijacking](https://github.com/advisories/GHSA-q8qp-cvcw-x6jj) |
| [#28](https://github.com/samlam369/Kobo-Crawler/security/dependabot/28) | axios | medium | 1.15.1 | [Axios: XSRF Token Cross-Origin Leakage via Prototype Pollution Gadget in `withXSRFToken` Boolean Coercion](https://github.com/advisories/GHSA-xx6v-rp6x-q39c) |
| [#27](https://github.com/samlam369/Kobo-Crawler/security/dependabot/27) | basic-ftp | high | 5.3.1 | [basic-ftp allows a malicious FTP server to cause client-side denial of service via unbounded multiline control response buffering](https://github.com/advisories/GHSA-rpmf-866q-6p89) |
| [#26](https://github.com/samlam369/Kobo-Crawler/security/dependabot/26) | axios | medium | 1.15.1 | [Axios' HTTP adapter-streamed uploads bypass maxBodyLength when maxRedirects: 0](https://github.com/advisories/GHSA-5c9x-8gcm-mpgx) |
| [#25](https://github.com/samlam369/Kobo-Crawler/security/dependabot/25) | axios | medium | 1.15.1 | [Axios: CRLF Injection in multipart/form-data body via unsanitized blob.type in formDataToStream](https://github.com/advisories/GHSA-445q-vr5w-6q77) |
| [#24](https://github.com/samlam369/Kobo-Crawler/security/dependabot/24) | axios | medium | 1.15.1 | [Axios: no_proxy bypass via IP alias allows SSRF](https://github.com/advisories/GHSA-m7pr-hjqh-92cm) |
| [#23](https://github.com/samlam369/Kobo-Crawler/security/dependabot/23) | axios | high | 1.15.1 | [Axios: Prototype Pollution Gadgets - Response Tampering, Data Exfiltration, and Request Hijacking](https://github.com/advisories/GHSA-pf86-5x62-jrwf) |
| [#22](https://github.com/samlam369/Kobo-Crawler/security/dependabot/22) | axios | medium | 1.15.1 | [Axios: HTTP adapter streamed responses bypass maxContentLength](https://github.com/advisories/GHSA-vf2m-468p-8v99) |
| [#21](https://github.com/samlam369/Kobo-Crawler/security/dependabot/21) | axios | low | 1.15.1 | [Axios: Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams](https://github.com/advisories/GHSA-xhjh-pmcv-23jw) |
| [#20](https://github.com/samlam369/Kobo-Crawler/security/dependabot/20) | axios | medium | 1.15.2 | [Axios: Invisible JSON Response Tampering via Prototype Pollution Gadget in `parseReviver`](https://github.com/advisories/GHSA-3w6x-2g7m-8v23) |
| [#19](https://github.com/samlam369/Kobo-Crawler/security/dependabot/19) | axios | high | 1.15.1 | [Axios: Header Injection via Prototype Pollution](https://github.com/advisories/GHSA-6chq-wfr3-2hj9) |
| [#18](https://github.com/samlam369/Kobo-Crawler/security/dependabot/18) | ip-address | medium | 10.1.1 | [ip-address has XSS in Address6 HTML-emitting methods](https://github.com/advisories/GHSA-v2v4-37r5-5v8g) |
| [#17](https://github.com/samlam369/Kobo-Crawler/security/dependabot/17) | axios | medium | 1.15.0 | [Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF](https://github.com/advisories/GHSA-3p68-rc4w-qgx5) |
| [#16](https://github.com/samlam369/Kobo-Crawler/security/dependabot/16) | basic-ftp | high | 5.3.0 | [basic-ftp vulnerable to denial of service via unbounded memory consumption in Client.list()](https://github.com/advisories/GHSA-rp42-5vxx-qpwr) |
| [#15](https://github.com/samlam369/Kobo-Crawler/security/dependabot/15) | axios | medium | 1.15.0 | [Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain](https://github.com/advisories/GHSA-fvcv-3m26-pcqx) |
| [#14](https://github.com/samlam369/Kobo-Crawler/security/dependabot/14) | follow-redirects | medium | 1.16.0 | [follow-redirects leaks Custom Authentication Headers to Cross-Domain Redirect Targets](https://github.com/advisories/GHSA-r4q5-vmmm-2653) |
| [#10](https://github.com/samlam369/Kobo-Crawler/security/dependabot/10) | basic-ftp | high | 5.2.2 | [basic-ftp: Incomplete CRLF Injection Protection Allows Arbitrary FTP Command Execution via Credentials and MKD Commands](https://github.com/advisories/GHSA-6v7q-wjvx-w8wg) |
| [#8](https://github.com/samlam369/Kobo-Crawler/security/dependabot/8) | basic-ftp | critical | 5.2.0 | [Basic FTP has Path Traversal Vulnerability in its downloadToDir() method](https://github.com/advisories/GHSA-5rq4-664w-9x2c) |
| [#7](https://github.com/samlam369/Kobo-Crawler/security/dependabot/7) | axios | high | 1.13.5 | [Axios is Vulnerable to Denial of Service via __proto__ Key in mergeConfig](https://github.com/advisories/GHSA-43fc-jf86-j433) |
