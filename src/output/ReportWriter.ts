import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { AgentResult } from "../agents/AgentProvider";

export async function writeReport(path: string, problem: string, codex: string, claude: string, judge: string): Promise<void> {
  const report = `# Multi-Agent Analysis\n\n## Problem\n${problem}\n\n## Codex Analysis\n${codex}\n\n## Claude Analysis\n${claude}\n\n${judge.trim()}\n`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, report, "utf8");
}

export async function writeDebug(directory: string, result: AgentResult): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, `${result.agent.toLowerCase()}-${Date.now()}-${randomUUID()}.json`), JSON.stringify(result, null, 2), "utf8");
}
