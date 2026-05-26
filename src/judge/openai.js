import OpenAI from "openai";
import { JUDGE_SYSTEM_PROMPT } from "../config.js";
import { sleep } from "../http.js";

/**
 * @param {{ apiKey: string, model: string, judgeDelayMs: number }} cfg
 * @param {{ title: string, location: string, url: string, text: string }} resume
 */
export async function judgeResume(cfg, resume) {
  if (!cfg.apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Copy .env.example to .env and add your key.");
  }

  const client = new OpenAI({ apiKey: cfg.apiKey });
  if (cfg.judgeDelayMs > 0) await sleep(cfg.judgeDelayMs);

  const userContent = [
    `Resume title: ${resume.title}`,
    resume.location ? `Listed location: ${resume.location}` : "",
    `Source: ${resume.url}`,
    "",
    "--- RESUME TEXT ---",
    resume.text.slice(0, 120_000),
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: cfg.model,
    temperature: 0.2,
    messages: [
      { role: "system", content: JUDGE_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const verdict = completion.choices[0]?.message?.content?.trim() || "";
  const isYes = /^YES\b/i.test(verdict);

  return {
    verdict,
    isYes,
    usage: completion.usage,
  };
}
