const startBrowser = require("./browser");
const scrapeController = require("./scrapeController");
const path = require("path");
const express = require("express");
const fs = require("fs");
const app = express();
const filePath = path.join(__dirname, "./article.json");
const connectDB = require("./db/connect");
const Article = require("./models/articleModel");
const scraper = require("./scraper");
require("dotenv").config();

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
