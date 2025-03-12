const {By,Key,Builder} = require("selenium-webdriver");
require("chromedriver");

async function visitKoboBlog() { 
    const urlKoboBlog = "https://www.kobo.com/zh/blog/";

    // Wait for the browser to build and launch properly
    console.log('Launching the browser');
    const driver = await new Builder().forBrowser("chrome").build();

    // Navigate to Kobo Blog
    console.log('Navigating to Kobo Blog');
    await driver.get(urlKoboBlog);
    
    // Take a screenshot and save it to the current directory
    console.log('Taking a screenshot');
    const screenshot = await driver.takeScreenshot();
    const imageBuffer = Buffer.from(screenshot, 'base64');
    console.log('Screenshot taken');
    const date = new Date();
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    const hour = `0${date.getHours()}`.slice(-2);
    const minute = `0${date.getMinutes()}`.slice(-2);
    const second = `0${date.getSeconds()}`.slice(-2);
    const foldername = 'Screenshots';
    const fs = require('fs');
    const filename = `${foldername}/${year}-${month}-${day}_${hour}${minute}${second}.png`;
    if (!fs.existsSync(foldername)) {
        console.log(`Creating folder ${foldername}`);
        fs.mkdirSync(foldername);
    }
    fs.writeFileSync(filename, imageBuffer);
    console.log(`Screenshot saved to ${filename}`);
     
    // Quit the browser after execution
    console.log('Closing the browser');
    await driver.quit();
}

visitKoboBlog();