const scraper = require("./scraper");
const Article = require("./models/articleModel");

const scrapeController = async (browserInstance) => {
  const url = "https://lifestyle.znews.vn/oto-xe-may.html";
  try {
    const browser = await browserInstance;
    // Gọi hàm cào dữ liệu ở scraper.js

    const result = await scraper(browser, url);

    if (result.length !== 0) {
      try {
        await Article.insertMany(result);

        console.log("Added new data to MongoDB successfully.");
      } catch (error) {
        console.error("Error saving data to MongoDB:", error);
      }
    }

    await browser.close();
    console.log("Browser is closed");
  } catch (error) {
    console.log("Error in scrapeController: ", error);
  }
};

module.exports = scrapeController;
