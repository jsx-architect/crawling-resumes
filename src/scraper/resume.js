import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

/**
 * @param {string} url
 * @param {number} delayMs
 */
export async function fetchResumeText(url, delayMs = 0) {
  const html = await fetchHtml(url, { delayMs });
  const $ = cheerio.load(html);

  const title = $("h1").first().text().trim();
  const location =
    $('a.colorLocation').first().text().trim() ||
    $(".colorLocation").first().text().trim();

  const resumeHeading = $("h4")
    .filter((_, el) => /resume/i.test($(el).text()))
    .first();
  const resumeBlock = resumeHeading.next(".normalText");
  let text = "";
  if (resumeBlock.length) {
    text = resumeBlock
      .find("p")
      .map((_, p) => $(p).text().trim())
      .get()
      .filter(Boolean)
      .join("\n\n");
    if (!text) text = resumeBlock.text().trim();
  }

  if (!text) {
    text = $(".normalText")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
  }

  return {
    url,
    title,
    location,
    text,
    charCount: text.length,
  };
}
