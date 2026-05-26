import fs from "node:fs/promises";
import path from "node:path";

export async function ensureOutputDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function appendJsonl(filePath, record) {
  await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
}

export async function writeSummary(dir, meta) {
  const filePath = path.join(dir, "summary.json");
  await fs.writeFile(filePath, JSON.stringify(meta, null, 2), "utf8");
  return filePath;
}

export function parseVerdictFields(verdict) {
  const lines = verdict.split(/\r?\n/).map((l) => l.trim());
  const first = lines[0]?.toUpperCase() || "";
  const fields = {};
  for (const line of lines.slice(1)) {
    const m = line.match(/^([^:]+):\s*(.*)$/i);
    if (m) fields[m[1].toLowerCase().replace(/\s+/g, "_")] = m[2].trim();
  }
  return { decision: first, fields };
}
