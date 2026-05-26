# PostJobFree resume judge

Automates your manual workflow:

1. Search [PostJobFree](https://www.postjobfree.com/resumes) with your query (pagination supported).
2. Open each resume and extract the resume text.
3. Send text to OpenAI with your React+Node judge prompt.
4. Save structured results (`results.jsonl`, `yes-matches.txt`).

## Why OpenAI API instead of ChatGPT in the browser?

Your custom GPT (`chatgpt.com/c/6a153e0c-...`) only works in the ChatGPT UI. Scripts cannot paste into that chat reliably without brittle browser automation. This project uses the **same instructions** via the [OpenAI API](https://platform.openai.com/) (`gpt-4o` / `gpt-4o-mini`). ChatGPT Plus and API billing are separate—you need an API key.

## Setup

```bash
cd test-crawling-pjf
npm install
copy .env.example .env
```

Edit `.env`:

- `OPENAI_API_KEY` — from [API keys](https://platform.openai.com/api-keys)
- `SEARCH_QUERY` — your long boolean query from the screenshot
- `MAX_RESUMES=5` — start small while testing

## Run

```bash
# Full pipeline (recommended first test with MAX_RESUMES=3)
npm start

# Only collect links (no API cost)
npm run scrape

# Judge resumes from a previous scrape
npm start -- --judge-only --links-file=output/2026-05-26T12-00-00-000Z/resume-links.json
```

CLI overrides:

```bash
npm start -- --max-resumes 10 --max-pages 2
```

## Output

Each run creates `output/<timestamp>/`:

| File | Purpose |
|------|---------|
| `resume-links.json` | All collected resume URLs |
| `results.jsonl` | One JSON object per resume (verdict + metadata) |
| `yes-matches.txt` | Human-readable YES blocks (like your ChatGPT example) |
| `summary.json` | Counts and paths |

Example YES block:

```
YES

LinkedIn: linkedin.com/in/example
Email: No
Location: Seattle, WA
Personal Website: No
```

## Search URL (from your screenshot)

The site uses GET parameters:

- `q` — search expression
- `l` — location (`United States`)
- `radius` — miles (`500`)
- `p` — page number (`2`, `3`, …)

Defaults in `.env.example` match your screenshot query.

## Legal / etiquette

- Respect PostJobFree [Terms of Service](https://www.postjobfree.com/terms-of-service).
- Use reasonable `REQUEST_DELAY_MS` (default 800ms).
- Do not redistribute personal data without consent.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `OPENAI_API_KEY is not set` | Create `.env` from `.env.example` |
| Empty resume text | Site layout may have changed—open an issue / check `src/scraper/resume.js` |
| Too many results | Set `MAX_PAGES` or `MAX_RESUMES` |
| Rate limits (OpenAI) | Increase `JUDGE_DELAY_MS` or lower `RESUME_CONCURRENCY` |
