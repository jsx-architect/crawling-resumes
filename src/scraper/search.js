import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

/**
 * @param {{ baseUrl: string, query: string, location: string, radius: string, maxPages: number, requestDelayMs: number }} opts
 */
export async function collectResumeLinks(opts) {
  const links = [];
  const seen = new Set();
  let page = 1;
  let totalReported = null;
  let lastPageKnown = null;

  while (true) {
    const url = buildSearchUrl(opts, page);
    const html = await fetchHtml(url, {
      delayMs: page === 1 ? 0 : opts.requestDelayMs,
    });
    const $ = cheerio.load(html);

    if (totalReported === null) {
      const m = $("body")
        .text()
        .match(/Resumes\s+\d+\s*-\s*\d+\s+of\s+([\d,]+)/i);
      if (m) totalReported = parseInt(m[1].replace(/,/g, ""), 10);
      const lastPager = $('a.pager[href*="&p="]')
        .map((_, el) => {
          const href = $(el).attr("href") || "";
          const pm = href.match(/[?&]p=(\d+)/);
          return pm ? parseInt(pm[1], 10) : 0;
        })
        .get()
        .filter(Boolean);
      if (lastPager.length) lastPageKnown = Math.max(...lastPager);
    }

    $("h3.itemTitle a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || !href.startsWith("/resume/")) return;
      const full = href.startsWith("http") ? href : `${opts.baseUrl}${href}`;
      if (!seen.has(full)) {
        seen.add(full);
        links.push({
          url: full,
          title: $(el).text().trim(),
        });
      }
    });

    const totalPages =
      totalReported > 0 ? Math.ceil(totalReported / 10) : lastPageKnown;
    const maxPages =
      opts.maxPages > 0 ? opts.maxPages : totalPages || page;
    if (page >= maxPages) break;
    if (!$('a.pager[href*="&p="]').length && page > 1) break;
    page += 1;
  }

  let capped = links;
  if (opts.maxResumes > 0) capped = links.slice(0, opts.maxResumes);

  return {
    links: capped,
    totalReported,
    pagesFetched: page,
  };
}

function buildSearchUrl(opts, page) {
  const params = new URLSearchParams({
    q: opts.query,
    l: opts.location,
    radius: opts.radius,
  });
  if (page > 1) params.set("p", String(page));
  return `${opts.baseUrl}/resumes?${params.toString()}`;
}
