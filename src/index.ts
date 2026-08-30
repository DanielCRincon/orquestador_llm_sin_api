import { resolve } from "node:path";
import { CodexAgent } from "./agents/CodexAgent";
import { ClaudeAgent } from "./agents/ClaudeAgent";
import { loadContext } from "./input/ContextLoader";
import { parseCliOptions, positiveIntegerFromEnv } from "./input/CliOptions";
import { buildAnalysisPrompt, buildJudgePrompt, runJudge } from "./consensus/ConsensusAgent";
import { writeDebug, writeReport } from "./output/ReportWriter";

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const maxContext = positiveIntegerFromEnv("MAX_CONTEXT_CHARS", 12000);
  const maxPrompt = positiveIntegerFromEnv("MAX_PROMPT_CHARS", 30000);
  const timeoutMs = positiveIntegerFromEnv("AGENT_TIMEOUT_MS", 180000);
  const maxOutputChars = positiveIntegerFromEnv("MAX_AGENT_OUTPUT_CHARS", 1_000_000);
  const context = await loadContext(options.files, maxContext);
  const workingDirectory = process.cwd();
  const codex = new CodexAgent(timeoutMs, maxOutputChars);
  const claude = new ClaudeAgent(timeoutMs, maxOutputChars);
  const common = { problem: options.problem, context, workingDirectory };

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

  await writeReport(resolve(options.output), common.problem, codexResult.stdout, claudeResult.stdout, judgeResult.stdout);
  console.log(`Informe creado: ${resolve(options.output)}`);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
