# Kobo-Crawler

A Node.js script to scrape weekly sales and daily deals from the Kobo blog, including book metadata and IDs. Uses Selenium WebDriver and Chrome.

## Features
- Extracts weekly sales links from the Kobo blog
- Retrieves daily deals, book details, and book IDs (ISBN)
- Optionally disables image loading for faster scraping

## Requirements
- Node.js (v18 or newer recommended)
- Chrome browser installed

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/samlam369/Kobo-Crawler.git
   cd Kobo-Crawler
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Automated Testing & CI

- To run the crawler test locally:
  ```bash
  npm test
  ```
- Jenkins or any CI will automatically run `npm install` and `npm test` if you use the provided Jenkinsfile.


You can run the crawler using either of the following methods:

### 1. With npm (Recommended)
```bash
npm start
```

### 2. Directly with Node.js
```bash
node dothething.js
```

#### On Windows, you may need:
```bash
node .\dothething.js
```

### Optional: Disable image loading
Set the environment variable `LOAD_IMAGES` to `false` to disable image loading (for faster scraping):
```bash
LOAD_IMAGES=false npm start
```

## Output
- The script prints extracted deal data as JSON to the console.
- Book metadata includes title, author, sales copy, link, cover image, and ISBN.

## Customization
- The main script is in `dothething.js`. Adjust selectors or logic as needed for changes in the Kobo blog layout.

## License
ISC

## Issues
Report issues or suggestions at [GitHub Issues](https://github.com/samlam369/Kobo-Crawler/issues).
