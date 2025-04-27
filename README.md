# Kobo Crawler

This project contains a Node.js script (`dothething.js`) that scrapes the Kobo blog to find the latest weekly book deals and extracts details for each daily deal, including the ISBN.

## Prerequisites

- Node.js (version compatible with ES Modules and async/await)
- npm (usually comes with Node.js)
- Google Chrome browser installed (as the script uses ChromeDriver)

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd Kobo-Crawler
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
    This will install `selenium-webdriver`.

## Usage

Run the script from the project's root directory:

```bash
node dothething.js
```

The script will:
1.  Launch a Chrome browser instance.
2.  Navigate to the Kobo blog (`https://www.kobo.com/zh/blog`).
3.  Find the link to the latest "【一週99書單】" (Weekly 99 Deals) post.
4.  Navigate to that post.
5.  Extract the daily book deals (date, title, author, sales copy, link, cover image).
6.  Navigate to each book's page to retrieve its ISBN (Book ID).
7.  Print the collected daily deals (including ISBNs) as a JSON array to the console.
8.  Exit with code 0 on success or code 1 on error.

### Disabling Image Loading

To potentially speed up the script and reduce bandwidth, you can disable image loading by setting the `LOAD_IMAGES` environment variable to `false`:

**Windows (cmd.exe):**
```bash
set LOAD_IMAGES=false && node dothething.js
```

**Windows (PowerShell):**
```bash
$env:LOAD_IMAGES="false"; node dothething.js
```

**Linux/macOS:**
```bash
LOAD_IMAGES=false node dothething.js
```

## Error Handling

The script includes error handling. If any step fails (e.g., page structure changes, elements not found, ISBN missing), it will log an error message to the console and exit with a status code of 1.

## Jenkins Integration

This script is designed to be run in CI/CD environments like Jenkins.
- It exits with a non-zero status code (1) on failure, which Jenkins can use to determine build status.
- A `Jenkinsfile` is included in the repository as a starting point for pipeline configuration.
- Ensure the Jenkins execution environment has Node.js, npm, and Google Chrome installed.
- Consider using the `LOAD_IMAGES=false` environment variable in Jenkins jobs for efficiency.