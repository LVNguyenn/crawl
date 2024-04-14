const scraper = require("./scraper");
//const fs = require("fs");
const path = require("path");
const Article = require("./models/articleModel");

const scrapeController = async (browserInstance) => {
  const url = "https://lifestyle.znews.vn/oto-xe-may.html";
  try {
    const browser = await browserInstance;
    // Gọi hàm cào dữ liệu ở scraper.js

    const result = await scraper(browser, url);
    //const filePath = path.join(__dirname, "./article.json");

    // if (result.length !== 0) {
    //   fs.readFile(filePath, (err, data) => {
    //     if (err) {
    //       console.log("Error reading file:", err);
    //       return;
    //     }

    //     let jsonData = [];
    //     try {
    //       jsonData = JSON.parse(data);
    //     } catch (error) {
    //       console.log("Error parsing JSON data:", error);
    //       return;
    //     }

    //     result.reverse().forEach((item) => {
    //       jsonData.unshift(item);
    //     });

    //     fs.writeFile(filePath, JSON.stringify(jsonData), (err) => {
    //       if (err) {
    //         console.log("Error writing file:", err);
    //       } else {
    //         console.log("Added new data successfully.");
    //       }
    //     });
    //   });
    // }

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
