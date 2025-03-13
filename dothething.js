const {By,Key,Builder, Capabilities} = require("selenium-webdriver");
require("chromedriver");

/**
 * Extract target links from the given cards.
 * @param {WebElement[]} cards - elements of CSS selector `.card`
 * @returns {Promise<string[]>} - target links
 */
async function extractweeklySalesLinks(cards) {
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


function formatDate(dateStr) {
    const currentYear = new Date().getFullYear();
    const [month, day] = dateStr.split('/').map(num => num.padStart(2, '0'));
    return `${currentYear}-${month}-${day}`;
}



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
        deal.link = link.split("?utm_source").shift();
        
        const bookCover = await book[1].findElement(By.css('img')).getAttribute('src');
        deal.bookCover = bookCover;

        dailyDeals.push(deal);
    }

    return dailyDeals;
}

async function extractISBN(metadata) {
    let isbn = "";

    
    /**
     * Sample return of metadata:
     * 遠流出版
     * 發布日期： 2023年5月15日
     * 書籍ID：3099573278818
     * 語言：中文
     * 下載選項：EPUB 3 (Adobe DRM)
     */
    let lines = await metadata.findElements(By.css('ul > li'));
    // for loop for each line

    for (let i = 0; i < lines.length; i++) {
        const text = await lines[i].getText();
        if (text.includes('書籍ID')) {
            isbn = text.split('：').pop().trim();
            break;
        }
    }

    return isbn;
}

(async () => {
    console.log("Starting the job");

    const driver = await new Builder().forBrowser('chrome').build();
    

    try {
        /**
         * console.log("Navigating to the Kobo blog page");
         * await driver.manage().setTimeouts({ implicit: 5000 });
         * await driver.get('https://www.kobo.com/zh/blog');
         * 
         * console.log("Waiting for card elements to load");
         * const cards = await driver.findElements(By.css('.card'));
         * 
         * console.log("Extracting target links from the cards");
         * const weeklySalesLinks = await extractweeklySalesLinks(cards);
         */
        
        // Hard-coding the link to the latest sales
        const weeklySalesLinks = ['https://www.kobo.com/zh/blog/weekly-dd99-2025-w11'];
        console.log("Weekly Sales:", weeklySalesLinks);

        console.log("Navigating to the latest sales link");
        await driver.get(weeklySalesLinks[0]);

        console.log("Weekly Sales Title:", await driver.getTitle());

        const blocks = await driver.findElements(By.css('.content-block, .book-block'));
        blocks.shift(); // Remove the first element because it's a header

        const dailyDeals = await extractDailyDeals(blocks);


        //Add ISBN to the books
        for (const deal of dailyDeals) {
            console.log("Navigating to the individual book page");
            await driver.get(deal.link);
            const metadata = await driver.findElement(By.css('.bookitem-secondary-metadata'));
    
            const isbn = await extractISBN(metadata);
            deal.isbn = isbn;
        }
        
        console.log("Daily Deals:", JSON.stringify(dailyDeals));

    } finally {
        console.log("Quitting the web driver");
        await driver.quit();
    }
})();


