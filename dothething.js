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

async function extractDailyDeals(blocks) {
    const dailyDeals = [];
    const dailyDealsRaw = [];


    [0, 2, 4, 6, 8, 10, 12, 14].forEach(i => {
        dailyDealsRaw.push([blocks[i], blocks[i + 1]]);
    });


    for (const pair of dailyDealsRaw) {
        const titleLine = await pair[0].findElement(By.css('h3')).getText();
        const date = titleLine.substring(0, titleLine.indexOf('週'));
        console.log("Date:", date);
        const link = await pair[0].findElement(By.css('a')).getAttribute('href');
        console.log("Link:", link);
        const title = await pair[1].findElement(By.css('.title')).getText();
        console.log("Title:", title);
        const author = await pair[1].findElement(By.css('.author')).getText();
        console.log("Author:", author);
        const image = await pair[1].findElement(By.css('img')).getAttribute('src');
        console.log("Image:", image);
        dailyDeals.push({
            'date': date,
            'link': link,        
            'title': title,
            'author': author,
            'image': image});
    }
    console.log("Daily Deals:", JSON.stringify(dailyDeals));
    return dailyDeals;
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
        console.log("Page title:", await driver.getTitle());

        const blocks = await driver.findElements(By.css('.content-block, .book-block'));
        blocks.shift(); // Remove the first element because it's a header

        const dailyDeals = await extractDailyDeals(blocks);
        console.log("Daily Deals:", dailyDeals);
        
    } finally {
        console.log("Quitting the web driver");
        await driver.quit();
    }
})();


