import "dotenv/config";

const num = (key, fallback) => {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  searchQuery: process.env.SEARCH_QUERY || "(react or reactjs) (node or nodejs)",
  searchLocation: process.env.SEARCH_LOCATION || "United States",
  searchRadius: process.env.SEARCH_RADIUS || "500",
  maxPages: num("MAX_PAGES", 0),
  maxResumes: num("MAX_RESUMES", 0),
  requestDelayMs: num("REQUEST_DELAY_MS", 800),
  resumeConcurrency: num("RESUME_CONCURRENCY", 2),
  judgeDelayMs: num("JUDGE_DELAY_MS", 500),
  outputDir: process.env.OUTPUT_DIR || "output",
  baseUrl: "https://www.postjobfree.com",
};

export const JUDGE_SYSTEM_PROMPT = `I'll show u a resume, and judge this is react+node focused resume or not. just give me the answer: YES or NO

If "YES", find linkedin url and email address, location, personal website url. if no result for a field, write No for that field. Format exactly like:

YES

LinkedIn: <value or No>
Email: <value or No>
Location: <value or No>
Personal Website: <value or No>

If "NO", judge this resume's main core stack with one sentence only (no long explanation). Format exactly like:

NO

<one sentence about main core stack>`;
