const {By,Key,Builder} = require("selenium-webdriver");
require("chromedriver");

(async function () {
    const driver = await new Builder().forBrowser('chrome').build();

    try {
        await driver.get('https://www.kobo.com/zh/blog');

        const until = require('selenium-webdriver/lib/until');
        await driver.wait(until.elementsLocated(By.css('.card')), 30000);

        const cards = await driver.findElements(By.css('.card'));

        const targetLinks = [];

        for (const card of cards) {
            const text = await card.getText();

            if (text.includes('【一週99書單】')) {
                const link = await card.findElement(By.css('a.card__link')).getAttribute('href');
                targetLinks.push(link);
            }
        }

        console.log(targetLinks);

    } finally {
        await driver.quit();
    }
})();
