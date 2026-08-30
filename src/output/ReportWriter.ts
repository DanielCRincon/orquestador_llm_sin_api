import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { AgentResult } from "../agents/AgentProvider";
import { extractFinalAnswer, extractJudgeSection } from "../consensus/ConsensusAgent";

export async function writeReport(path: string, problem: string, judge: string): Promise<void> {
  const section = (name: string) => extractJudgeSection(judge, name) || "No disponible.";
  const report = `# Revisión ABAP\n\n## Problema\n${problem}\n\n## Respuesta final\n${extractFinalAnswer(judge)}\n\n## Consenso\n${section("Consensus")}\n\n## Desacuerdos relevantes\n${section("Relevant Disagreements")}\n\n## Rationale\n${section("Rationale")}\n\n## Riesgos restantes\n${section("Remaining Risks")}\n\n## Pruebas sugeridas\n${section("Suggested Tests")}\n`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, report, "utf8");
}

export async function writeDebug(directory: string, result: AgentResult): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, `${result.agent.toLowerCase()}-${Date.now()}-${randomUUID()}.json`), JSON.stringify(result, null, 2), "utf8");
}
