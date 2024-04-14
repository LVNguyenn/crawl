//import { scrollPageToBottom } from "puppeteer-autoscroll-down";
//const getLastDayCrawl = require("./utils");
const path = require("path");
const Article = require("./models/articleModel");
const moment = require("moment");

function scrollPage(scrollDirection) {
  return async (page, { delay = 100, size = 250, stepsLimit = null } = {}) => {
    let lastScrollPosition = await page.evaluate(
      async (pixelsToScroll, delayAfterStep, limit, direction) => {
        let getElementScrollHeight = (element) => {
          if (!element) return 0;
          let { clientHeight, offsetHeight, scrollHeight } = element;
          return Math.max(scrollHeight, offsetHeight, clientHeight);
        };

        let initialScrollPosition = window.pageYOffset;
        let availableScrollHeight = getElementScrollHeight(document.body);
        let lastPosition = direction === "bottom" ? 0 : initialScrollPosition;

        let scrollFn = (resolve) => {
          let intervalId = setInterval(() => {
            window.scrollBy(
              0,
              direction === "bottom" ? pixelsToScroll : -pixelsToScroll
            );
            lastPosition +=
              direction === "bottom" ? pixelsToScroll : -pixelsToScroll;

            if (
              (direction === "bottom" &&
                lastPosition >= availableScrollHeight) ||
              (direction === "bottom" &&
                limit !== null &&
                lastPosition >= pixelsToScroll * limit) ||
              (direction === "top" && lastPosition <= 0) ||
              (direction === "top" &&
                limit !== null &&
                lastPosition <= initialScrollPosition - pixelsToScroll * limit)
            ) {
              clearInterval(intervalId);
              resolve(lastPosition);
            }
          }, delayAfterStep);
        };

        return new Promise(scrollFn);
      },
      size,
      delay,
      stepsLimit,
      scrollDirection
    );

    return lastScrollPosition;
  };
}

const scrollPageToBottom = scrollPage("bottom");

const scraper = async (browser, url) => {
  try {
    const newPage = await browser.newPage();
    console.log("New tab opened ...");
    await newPage.goto(url);
    console.log("Access the page: " + url);

    await newPage.waitForSelector("div.page-wrapper");
    console.log("The page-category tag has been loaded ...");

    await scrollPageToBottom(newPage, {
      size: 200,
      delay: 100,
    });

    const scrapeData = [];

    const filePath = path.join(__dirname, "./article.json");
    // const lastDay = await getLastDayCrawl(filePath);
    const lastDay = await Article.findOne()
      .sort({ "meta.publish": -1 })
      .limit(1)
      .select("meta.publish")
      .lean();
    console.log("LastDay: ", lastDay.meta.publish);

    // lấy link và thumbnail
    const detailLinks = await newPage.$$eval(
      "#news-latest > section > div > article",
      (els, lastDay) => {
        const result = [];
        function compareDateTime(date1, date2) {
          return new Date(date1) > new Date(date2);
        }
        const formatDate = (dateString) => {
          const date = new Date(dateString);
          const day = (date.getMonth() + 1).toString().padStart(2, "0"); // Lấy tháng và thêm số 0 phía trước nếu cần
          const month = date.getDate().toString().padStart(2, "0"); // Lấy ngày và thêm số 0 phía trước nếu cần
          const year = date.getFullYear().toString(); // Lấy năm

          const hour = date.getHours();
          const minute = date.getMinutes();

          return `${month}/${day}/${year} ${hour}:${minute}`;
        };
        for (const el of els) {
          let day = el.querySelector(
            "header p.article-meta > span > span"
          ).innerText;
          day = formatDate(day);
          //day = moment(day, "HH:mm DD/MM/YYYY");
          //const abc = lastDay.meta.publish;
          if (!compareDateTime(day, lastDay.meta.publish)) break;
          const thumbnail = el.querySelector("p > a > img")?.src;
          if (
            thumbnail ===
            "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
          )
            break;
          const link = el.querySelector("p > a")?.href;
          result.push({ day, thumbnail, link });
        }
        return result;
      },
      lastDay
    );

    const scraperDetail = async (link) => {
      try {
        let pageDetail = await browser.newPage();
        await pageDetail.goto(link);
        console.log("Access: " + link);
        await pageDetail.waitForSelector("#page-article");

        await scrollPageToBottom(pageDetail, {
          size: 260,
          delay: 100,
        });

        const detailData = {};
        // bắt đầu cào dữ liệu bài báo

        // cào id bài báo
        const id = await pageDetail.$eval("#page-article article", (el) =>
          el.getAttribute("article-id")
        );

        detailData.id = id;

        // cào tiêu đề
        const title = await pageDetail.$eval(
          "#page-article article > header",
          (el) => el.querySelector("h1").innerText
        );

        detailData.title = title;

        // cào tác giả và ngày đăng
        const meta = await pageDetail.$eval(
          "#page-article article > header ul.the-article-meta",
          (el) => ({
            author: el.querySelector("li:first-child > a").innerText,
            publish: el.querySelector("li:nth-child(2)").innerText,
          })
        );
        meta.publish = moment(meta.publish, "dddd, DD/MM/YYYY HH:mm", "vi");
        detailData.meta = meta;

        // cào nội dung chính

        // cào tóm tắt
        const summary = await pageDetail.$eval(
          "#page-article article section.main",
          (el) => el.querySelector("p").innerText
        );

        detailData.summary = summary;

        // cào nội dung bài báo
        const articleBodyContent = await pageDetail.evaluate(() => {
          const articleBody = document.querySelector(".the-article-body");
          const children = articleBody.children;
          const result = [];

          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.tagName === "P") result.push(child.innerText);
            else if (child.tagName === "H3") {
              result.push({ heading: child.innerText });
            } else if (
              child.tagName === "DIV" &&
              child.querySelector("img") &&
              child.classList.contains("z-photoviewer-wrapper")
            ) {
              // Nếu là thẻ div và có thẻ img bên trong thì lấy link ảnh
              const imgList = child.querySelectorAll("td.pic img");
              const imgUrls = Array.from(imgList).map((img) =>
                img.getAttribute("src")
              );
              if (child.querySelector("table.picture")) {
                const pTag = child.querySelector("p");
                let caption;
                if (pTag) caption = pTag.innerText;
                else {
                  const tdLastChild = child.querySelector(
                    "td.pCaption.caption"
                  );
                  if (tdLastChild) caption = tdLastChild.innerText;
                }
                const image = { imgUrls, caption };
                result.push(image);
              } else result.push(imgUrls);
            }
          }

          return result;
        });

        detailData.articleBodyContent = articleBodyContent;

        await pageDetail.close();
        console.log("Close: " + link);

        return detailData;
      } catch (error) {
        console.log("Get error data details: " + error);
        throw error;
      }
    };

    //const details = [];
    console.log(detailLinks.length);
    for (let link of detailLinks) {
      console.log("Day", link.day);
      // console.log("Last Day", link.abc);
      const detail = await scraperDetail(link.link);
      detail.thumbnail = link.thumbnail;
      //details.push(detail);
      scrapeData.push(detail);
    }
    //scrapeData.body = details;

    // const link =
    //   "https://lifestyle.znews.vn/porsche-macan-thuan-dien-lo-gia-ban-tai-viet-nam-post1469105.html";
    // const detail = await scraperDetail(link);
    // console.log(detail);
    // scrapeData.body = detail;

    return scrapeData;
  } catch (error) {
    console.log("Error in scraper", error);
    throw error;
  }
};

module.exports = scraper;
