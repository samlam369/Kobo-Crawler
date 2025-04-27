import { By, Builder } from "selenium-webdriver";
import chrome from 'selenium-webdriver/chrome.js';

/**
 * Extract target links from the given cards.
 * @param {WebElement[]} cards - elements of CSS selector `.card`
 * @returns {Promise<string[]>} - target links
 */
async function extractWeeklySalesLinks(cards) {
    const weeklySalesLinks = [];
    for (const card of cards) {
        const text = await card.getText();
        if (text.includes('【一週99書單】')) {
            const link = await card.findElement(By.css('a.card__link')).getAttribute('href');
            weeklySalesLinks.push(link);
        }
    }
    return weeklySalesLinks;
}


/**
 * Format a date string in the format "M/D" into a string in the format "YYYY-MM-DD"
 * @param {string} dateStr - date string in the format "M/D"
 * @returns {string} - formatted date string in the format "YYYY-MM-DD"
 */
function formatDate(dateStr) {
    const currentYear = new Date().getFullYear();
    const [month, day] = dateStr.split('/').map(num => num.padStart(2, '0'));
    return `${currentYear}-${month}-${day}`;
}

/**
 * Extract daily deals from the given content blocks.
 * @param {WebElement[]} blocks - elements of CSS selector `.book__info`
 * @returns {Promise<Object[]>} - array of daily deals, each as an object with properties:
 *   - date: {string} - date string in the format "YYYY-MM-DD"
 *   - title: {string} - title of the book
 *   - author: {string} - author of the book
 *   - salesCopy: {string} - sales copy of the book
 *   - link: {string} - link to the book page
 *   - bookCover: {string} - link to the book cover image
 */
async function extractDailyDeals(blocks) {
    const dailyDeals = [];
    const booksOf8 = [];

    [0, 2, 4, 6, 8, 10, 12, 14].forEach(i => {
        booksOf8.push([blocks[i], blocks[i + 1]]);
    });

    for (const book of booksOf8) {
        const deal = {};

        const titleLine = await book[0].findElement(By.css('h3')).getText();
        deal.date = formatDate(titleLine.split('週').shift());
        
        const title = await book[0].findElement(By.css('a')).getText();
        deal.title = title;
        
        const author = await book[1].findElement(By.css('.author')).getText();
        deal.author = author.slice(2, -2);

        const salesCopy = await book[0].findElement(By.css('p')).getText();
        deal.salesCopy = salesCopy;

        const link = await book[0].findElement(By.css('a')).getAttribute('href');
        // Use the URL object to remove query parameters and hash fragments
        const parsedUrl = new URL(link);
        deal.link = parsedUrl.origin + parsedUrl.pathname;
        
        const bookCover = await book[1].findElement(By.css('img')).getAttribute('src');
        deal.bookCover = bookCover;

        dailyDeals.push(deal);
    }

    return dailyDeals;
}

/**
 * Extract the ISBN (Book ID) from the metadata.
 * @param {WebElement[]} metadata - elements containing book metadata
 * @returns {Promise<string>} - extracted ISBN as a string, or an empty string if not found
 * 
 * The metadata is expected to contain lines of text, one of which includes
 * the '書籍ID' identifier followed by the ISBN. This function searches through
 * the metadata to find and return the ISBN.
 */

async function extractISBN(metadata) {    
    /**
     * Sample metadata:
     * 遠流出版
     * 發布日期： 2023年5月15日
     * 書籍ID：3099573278818
     * 語言：中文
     * 下載選項：EPUB 3 (Adobe DRM)
     */

    for (const line of metadata) {
        const text = await line.getText();
        if (text.includes('書籍ID')) {
            return text.split('：').pop().trim();
        }
    }

    return "";
}

(async () => {
    const isCI = process.env.CI === 'true';
    if (!isCI) console.log("Starting the job");

    // Determine whether to load images based on environment variable
    const loadImages = process.env.LOAD_IMAGES !== 'false'; // Default to true if not set or not 'false'

    const chromeOptions = new chrome.Options();
    if (!loadImages) {
        chromeOptions.addArguments('--blink-settings=imagesEnabled=false');
        chromeOptions.addArguments('--disable-images');
        if (!isCI) console.log("Image loading disabled.");
    } else {
        if (!isCI) console.log("Image loading enabled.");
    }

    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .build();
    

    try {
        if (!isCI) console.log("Navigating to the Kobo blog page");
        await driver.get('https://www.kobo.com/zh/blog');
        
        const cards = await driver.findElements(By.css('.card'));
        
        if (!isCI) console.log("Extracting blog posts on the page");
        const weeklySalesLinks = await extractWeeklySalesLinks(cards);
        
        if (!isCI) console.log("Navigating to the latest Weekly Sales link");
        await driver.get(weeklySalesLinks.shift());

        if (!isCI) console.log("Latest Weekly Sales:", await driver.getTitle());

        const blocks = await driver.findElements(By.css('.content-block, .book-block'));
        blocks.shift(); // Remove the first element because it's a header

        const dailyDeals = await extractDailyDeals(blocks);

        //Amending dailyDeals with the Kobo Book ID
        for (const deal of dailyDeals) {
            if (!isCI) console.log("Navigating to the individual book page to retrieve Book ID: " + deal.title);
            await driver.get(deal.link);
            const metadata = await driver.findElements(By.css('.bookitem-secondary-metadata > ul > li'));
            const isbn = await extractISBN(metadata);
            deal.isbn = isbn;
            // if (!isCI) console.log(JSON.stringify(deal, null, 2));
        }
        
        if (isCI) {
            // For CI: print only the JSON array, single line, with a unique prefix
            console.log('__JSON__' + JSON.stringify(dailyDeals));
        } else {
            console.log("Daily Deals:");
            console.log(JSON.stringify(dailyDeals, null, 2));
        }

    } finally {
        if (!isCI) console.log("Quitting the web driver");
        await driver.quit();
    }
})();
