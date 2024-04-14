const puppeteer = require("puppeteer");
require("dotenv").config();

const startBrowser = async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
  } catch (error) {
    console.log("Unable to create browser: " + error);
  }

  return browser;
};

module.exports = startBrowser;
