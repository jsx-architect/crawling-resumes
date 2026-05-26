import { config } from "./config.js";
import { runPipeline } from "./pipeline.js";

function printHelp() {
  console.log(`
postjobfree-resume-judge

Usage:
  npm start                          Full run: search → fetch resumes → GPT judge
  npm start -- --scrape-only         Only collect resume URLs (no OpenAI)
  npm start -- --judge-only --links-file=output/.../resume-links.json
  npm start -- --max-resumes 3       Cap resumes (also set MAX_RESUMES in .env)

Environment: copy .env.example → .env and set OPENAI_API_KEY.

Note: Your ChatGPT custom GPT (chatgpt.com/c/...) is not callable from scripts.
This project uses the same judge prompt via the OpenAI API. You need an API key
from platform.openai.com (billing is separate from ChatGPT Plus).
`);
}

function parseArgs(argv) {
  const flags = {
    scrapeOnly: argv.includes("--scrape-only"),
    judgeOnly: argv.includes("--judge-only"),
    help: argv.includes("--help") || argv.includes("-h"),
    linksFile: null,
  };

  const maxIdx = argv.indexOf("--max-resumes");
  if (maxIdx !== -1 && argv[maxIdx + 1]) {
    config.maxResumes = parseInt(argv[maxIdx + 1], 10) || config.maxResumes;
  }

  const linksIdx = argv.indexOf("--links-file");
  if (linksIdx !== -1 && argv[linksIdx + 1]) {
    flags.linksFile = argv[linksIdx + 1];
  }

  const pagesIdx = argv.indexOf("--max-pages");
  if (pagesIdx !== -1 && argv[pagesIdx + 1]) {
    config.maxPages = parseInt(argv[pagesIdx + 1], 10) || config.maxPages;
  }

  return flags;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }

  if (!flags.scrapeOnly && !config.openaiApiKey) {
    console.error("Missing OPENAI_API_KEY. See .env.example\n");
    printHelp();
    process.exit(1);
  }

  await runPipeline(config, flags);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
