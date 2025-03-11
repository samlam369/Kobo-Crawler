const {By,Key,Builder} = require("selenium-webdriver");
require("chromedriver");

async function openDuckDuckGo() { 
    const searchQuery = "Automation testing with Selenium and JavaScript";

    // Wait for the browser to build and launch properly
    console.log('Launching the browser');
    const driver = await new Builder().forBrowser("chrome").build();

    // Navigate to Duckduckgo
    console.log('Navigating to DuckDuckGo');
    await driver.get("https://duckduckgo.com");
    
    // Enter the search query and submit
    console.log('Entering the search query');
    await driver.findElement(By.name("q")).sendKeys(searchQuery, Key.RETURN);

    // Log the page title
    console.log('Getting page title');
    const pageTitle = await driver.getTitle();
    console.log('Page Title:', pageTitle);

    // Quit the browser after execution
    console.log('Closing the browser');
    await driver.quit();
}

openDuckDuckGo();