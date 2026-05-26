import fs from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import { collectResumeLinks } from "./scraper/search.js";
import { fetchResumeText } from "./scraper/resume.js";
import { judgeResume } from "./judge/openai.js";
import {
  appendJsonl,
  ensureOutputDir,
  parseVerdictFields,
  writeSummary,
} from "./output.js";

/**
 * @param {import('./config.js').config} cfg
 * @param {{ scrapeOnly?: boolean, judgeOnly?: boolean, linksFile?: string }} flags
 */
export async function runPipeline(cfg, flags = {}) {
  const startedAt = new Date().toISOString();
  const runId = startedAt.replace(/[:.]/g, "-");
  const outDir = path.resolve(cfg.outputDir, runId);
  await ensureOutputDir(outDir);

  const linksPath = path.join(outDir, "resume-links.json");
  const resultsPath = path.join(outDir, "results.jsonl");
  const yesPath = path.join(outDir, "yes-matches.txt");

  let links = [];

  if (flags.judgeOnly && flags.linksFile) {
    const raw = await fs.readFile(flags.linksFile, "utf8");
    const parsed = JSON.parse(raw);
    links = Array.isArray(parsed) ? parsed : parsed.links || [];
  } else {
    console.log("Searching PostJobFree...");
    const search = await collectResumeLinks({
      baseUrl: cfg.baseUrl,
      query: cfg.searchQuery,
      location: cfg.searchLocation,
      radius: cfg.searchRadius,
      maxPages: cfg.maxPages,
      maxResumes: cfg.maxResumes,
      requestDelayMs: cfg.requestDelayMs,
    });
    links = search.links;
    await fs.writeFile(
      linksPath,
      JSON.stringify(
        {
          totalReported: search.totalReported,
          pagesFetched: search.pagesFetched,
          collected: links.length,
          links,
        },
        null,
        2
      ),
      "utf8"
    );
    console.log(
      `Site reports ~${search.totalReported ?? "?"} resumes; collected ${links.length} link(s) (${search.pagesFetched} page(s)).`
    );
    console.log(`Links saved: ${linksPath}`);
  }

  if (flags.scrapeOnly) {
    return { outDir, linksPath, count: links.length };
  }

  const limit = pLimit(cfg.resumeConcurrency);
  let processed = 0;
  let yesCount = 0;
  let errors = 0;

  console.log(`Processing ${links.length} resume(s) with OpenAI (${cfg.openaiModel})...`);

  const tasks = links.map((link, index) =>
    limit(async () => {
      const label = `[${index + 1}/${links.length}]`;
      try {
        const resume = await fetchResumeText(link.url, cfg.requestDelayMs);
        if (!resume.text || resume.text.length < 40) {
          console.warn(`${label} Skipped (too little text): ${link.url}`);
          return;
        }

        const judgment = await judgeResume(
          {
            apiKey: cfg.openaiApiKey,
            model: cfg.openaiModel,
            judgeDelayMs: cfg.judgeDelayMs,
          },
          resume
        );

        const parsed = parseVerdictFields(judgment.verdict);
        const record = {
          at: new Date().toISOString(),
          url: resume.url,
          title: resume.title,
          listedLocation: resume.location,
          isYes: judgment.isYes,
          verdict: judgment.verdict,
          parsed,
        };

        await appendJsonl(resultsPath, record);
        processed += 1;

        if (judgment.isYes) {
          yesCount += 1;
          const block = [
            "=".repeat(60),
            resume.title,
            resume.url,
            "",
            judgment.verdict,
            "",
          ].join("\n");
          await fs.appendFile(yesPath, `${block}\n`, "utf8");
        }

        console.log(`${label} ${judgment.isYes ? "YES" : "NO"} — ${resume.title}`);
        console.log(judgment.verdict);
        console.log("");
      } catch (err) {
        errors += 1;
        console.error(`${label} Error: ${link.url}`, err.message);
        await appendJsonl(resultsPath, {
          at: new Date().toISOString(),
          url: link.url,
          title: link.title,
          error: err.message,
        });
      }
    })
  );

  await Promise.all(tasks);

  const summaryPath = await writeSummary(outDir, {
    startedAt,
    finishedAt: new Date().toISOString(),
    searchQuery: cfg.searchQuery,
    searchLocation: cfg.searchLocation,
    model: cfg.openaiModel,
    totalLinks: links.length,
    processed,
    yesCount,
    errors,
    resultsPath,
    yesPath: yesCount > 0 ? yesPath : null,
  });

  console.log(`Done. YES matches: ${yesCount}/${processed}. Summary: ${summaryPath}`);
  return { outDir, resultsPath, yesPath, processed, yesCount };
}
