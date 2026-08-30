import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { AgentResult } from "../agents/AgentProvider";
import { extractFinalAnswer } from "../consensus/ConsensusAgent";

export async function writeReport(path: string, problem: string, judge: string): Promise<void> {
  const report = `# Final Answer\n\n## Problem\n${problem}\n\n## Answer\n${extractFinalAnswer(judge)}\n`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, report, "utf8");
}

export async function writeDebug(directory: string, result: AgentResult): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, `${result.agent.toLowerCase()}-${Date.now()}-${randomUUID()}.json`), JSON.stringify(result, null, 2), "utf8");
}
