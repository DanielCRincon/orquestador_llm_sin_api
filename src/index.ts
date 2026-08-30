import { resolve } from "node:path";
import { CodexAgent } from "./agents/CodexAgent";
import { ClaudeAgent } from "./agents/ClaudeAgent";
import { loadContext } from "./input/ContextLoader";
import { buildAnalysisPrompt, buildJudgePrompt, runJudge } from "./consensus/ConsensusAgent";
import { writeDebug, writeReport } from "./output/ReportWriter";

function optionValues(args: string[], name: string): string[] {
  return args.flatMap((value, index) => value === name && args[index + 1] ? [args[index + 1]] : []);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const problems = optionValues(args, "--problem");
  if (problems.length !== 1) throw new Error("Uso: npm start -- --problem \"...\" [--file ruta] [--out report.md]");
  const files = optionValues(args, "--file");
  const output = optionValues(args, "--out")[0] || "report.md";
  const maxContext = Number(process.env.MAX_CONTEXT_CHARS || 12000);
  const maxPrompt = Number(process.env.MAX_PROMPT_CHARS || 30000);
  const timeoutMs = Number(process.env.AGENT_TIMEOUT_MS || 180000);
  const context = await loadContext(files, maxContext);
  const workingDirectory = process.cwd();
  const codex = new CodexAgent(timeoutMs);
  const claude = new ClaudeAgent(timeoutMs);
  const common = { problem: problems[0], context, workingDirectory };

  console.log("Ejecutando Codex...");
  const codexResult = await codex.run({ ...common, prompt: buildAnalysisPrompt("Analiza independientemente el problema. Propón solución, riesgos y pruebas. No modifiques archivos ni ejecutes comandos.", common.problem, context, maxPrompt) });
  await writeDebug(resolve("runs"), codexResult);
  if (codexResult.exitCode !== 0) throw new Error(`Codex terminó con exit code ${codexResult.exitCode}: ${codexResult.stderr}`);

  console.log("Ejecutando Claude...");
  const claudeResult = await claude.run({ ...common, prompt: buildAnalysisPrompt("Analiza independientemente el problema. Propón solución, riesgos y pruebas. No modifiques archivos ni ejecutes comandos. No tienes acceso a otra propuesta.", common.problem, context, maxPrompt) });
  await writeDebug(resolve("runs"), claudeResult);
  if (claudeResult.exitCode !== 0) throw new Error(`Claude terminó con exit code ${claudeResult.exitCode}: ${claudeResult.stderr}`);

  console.log("Ejecutando juez Codex...");
  const judgeResult = await runJudge(codex, { ...common, prompt: buildJudgePrompt(common.problem, context, codexResult.stdout, claudeResult.stdout, maxPrompt) });
  await writeDebug(resolve("runs"), judgeResult);
  if (judgeResult.exitCode !== 0) throw new Error(`Juez Codex terminó con exit code ${judgeResult.exitCode}: ${judgeResult.stderr}`);

  await writeReport(resolve(output), common.problem, codexResult.stdout, claudeResult.stdout, judgeResult.stdout);
  console.log(`Informe creado: ${resolve(output)}`);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
