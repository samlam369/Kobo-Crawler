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
        // console.log("Card text:", text);
        if (text.includes('【一週99書單】')) {
            const link = await card.findElement(By.css('a.card__link')).getAttribute('href');
            weeklySalesLinks.push(link);
        }
    }
    return weeklySalesLinks;
}

(async () => {
    console.log("Starting the job");

    const driver = await new Builder().forBrowser('chrome').build();
    

    try {
        
        // console.log("Navigating to the Kobo blog page");
        // await driver.manage().setTimeouts({ implicit: 5000 });
        // await driver.get('https://www.kobo.com/zh/blog');

        // console.log("Waiting for card elements to load");
        // const cards = await driver.findElements(By.css('.card'));

        // console.log("Extracting target links from the cards");
        // const weeklySalesLinks = await extractweeklySalesLinks(cards);
        
        // Hard-coding the link to the latest sales
        const weeklySalesLinks = ['https://www.kobo.com/zh/blog/weekly-dd99-2025-w10'];
        console.log("Weekly Sales:", weeklySalesLinks);

        console.log("Navigating to the latest sales link");
        await driver.get(weeklySalesLinks[0]);
        console.log("Page title:", await driver.getTitle());

    } finally {
        console.log("Quitting the web driver");
        await driver.quit();
    }
})();


