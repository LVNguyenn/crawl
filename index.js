const startBrowser = require("./browser");
const scrapeController = require("./scrapeController");
//const cron = require("node-cron");
const path = require("path");
const express = require("express");
const fs = require("fs");
const app = express();
const filePath = path.join(__dirname, "./article.json");
const connectDB = require("./db/connect");
const Article = require("./models/articleModel");
const scraper = require("./scraper");
require("dotenv").config();

// cron.schedule(
//   "*/60 * * * * *",
//   async () => {
//     console.log("Running crawler...");

//     let browser = startBrowser();
//     await scrapeController(browser);
//   },
//   {
//     timezone: "Asia/Ho_Chi_Minh",
//   }
// );

// async function runCrawler() {
//   let browser = startBrowser();
//   await scrapeController(browser);

//   setTimeout(runCrawler, 60000);
// }

// runCrawler();

// app.get("/api/articles/:id", (req, res) => {
//   const articleId = req.params.id;

//   fs.readFile(filePath, "utf8", (err, data) => {
//     if (err) {
//       console.error("Error reading file:", err);
//       res.status(500).json({ status: "failed", msg: "Internal server error" });
//       return;
//     }

//     try {
//       const jsonData = JSON.parse(data);

//       const article = jsonData.find((article) => article.id === articleId);

//       if (!article) {
//         res.status(404).json({ status: "failed", msg: "Article not found" });
//       } else {
//         res.json(article);
//       }
//     } catch (parseError) {
//       console.error("Error parsing JSON:", parseError);
//       res.status(500).json({ status: "failed", msg: "Internal server error" });
//     }
//   });
// });

// app.get("/api/articles", (req, res) => {
//   fs.readFile(filePath, "utf8", (err, data) => {
//     if (err) {
//       console.error("Error reading file:", err);
//       res.status(500).json({ status: "failed", msg: "Internal server error" });
//       return;
//     }

//     try {
//       const articlesData = JSON.parse(data);

//       const page = Math.abs(parseInt(req.query.page)) || 1;
//       const perPage = Math.abs(parseInt(req.query.perPage)) || 5;

//       const startIndex = (page - 1) * perPage;
//       const endIndex = startIndex + perPage;

//       const articlesOnPage = articlesData.slice(startIndex, endIndex);

//       const transformedArticles = articlesOnPage.map((article) => ({
//         id: article.id,
//         thumbnail: article.thumbnail,
//         title: article.title,
//         publish: article.meta.publish,
//         summary: article.summary,
//       }));

//       const hasNextPage = endIndex < articlesData.length;

//       res.json({
//         article: transformedArticles,
//         page: page,
//         perPage: perPage,
//         total: articlesData.length,
//         hasNextPage: hasNextPage,
//       });
//     } catch (parseError) {
//       console.error("Error parsing JSON:", parseError);
//       res.status(500).json({ status: "failed", msg: "Internal server error" });
//     }
//   });
// });

app.get("/scrape", async (req, res) => {
  const url = "https://lifestyle.znews.vn/oto-xe-may.html";
  let browser1 = await startBrowser();

  try {
    const browser = browser1;

    const result = await scraper(browser, url);

    if (result.length !== 0) {
      try {
        await Article.insertMany(result);

        res
          .status(200)
          .json({ message: "Added new data to MongoDB successfully." });
      } catch (error) {
        console.error("Error saving data to MongoDB:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    } else {
      res.status(200).json({ message: "No new articles" });
    }

    await browser.close();
    console.log("Browser is closed");
  } catch (error) {
    console.log("Error in scrape route: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/articles", async (req, res) => {
  try {
    const page = Math.abs(parseInt(req.query.page)) || 1;
    const perPage = Math.abs(parseInt(req.query.perPage)) || 5;
    const startIndex = (page - 1) * perPage;

    const articlesData = await Article.find()
      .skip(startIndex)
      .limit(perPage)
      .exec();

    const transformedArticles = articlesData.map((article) => ({
      id: article.id,
      thumbnail: article.thumbnail,
      title: article.title,
      publish: article.meta.publish,
      summary: article.summary,
    }));

    const totalArticlesCount = await Article.countDocuments();
    const hasNextPage = startIndex + perPage < totalArticlesCount;

    res.json({
      articles: transformedArticles,
      page: page,
      perPage: perPage,
      total: totalArticlesCount,
      hasNextPage: hasNextPage,
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ status: "failed", msg: "Internal server error" });
  }
});

app.get("/api/articles/:id", async (req, res) => {
  const articleId = req.params.id;

  try {
    const article = await Article.findOne({ id: articleId });

    if (!article) {
      return res
        .status(404)
        .json({ status: "failed", msg: "Article not found" });
    }

    res.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ status: "failed", msg: "Internal server error" });
  }
});

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, console.log(`Server is listening on port ${port}...`));
  } catch (error) {
    console.log(error);
  }
};

start();
