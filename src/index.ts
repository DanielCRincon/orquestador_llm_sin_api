import { resolve } from "node:path";
import { CodexAgent } from "./agents/CodexAgent";
import { ClaudeAgent } from "./agents/ClaudeAgent";
import { AgentProvider, AgentRequest, AgentResult } from "./agents/AgentProvider";
import { loadContext } from "./input/ContextLoader";
import { parseCliOptions, positiveIntegerFromEnv } from "./input/CliOptions";
import { buildAnalysisPrompt, buildJudgePrompt, runJudge } from "./consensus/ConsensusAgent";
import { writeDebug, writeReport } from "./output/ReportWriter";

const ANALYSIS_INSTRUCTIONS = "Analiza independientemente el problema. Propón solución, riesgos y pruebas. No modifiques archivos ni ejecutes comandos. No tienes acceso a otra propuesta.";

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

  const [codexResult, claudeResult] = await Promise.all([
    runAgentStep("Codex", codex, { ...common, prompt: buildAnalysisPrompt(ANALYSIS_INSTRUCTIONS, common.problem, context, maxPrompt) }),
    runAgentStep("Claude", claude, { ...common, prompt: buildAnalysisPrompt(ANALYSIS_INSTRUCTIONS, common.problem, context, maxPrompt) })
  ]);
  assertSuccessful(codexResult);
  assertSuccessful(claudeResult);

  const judgeResult = await runAgentStep("juez Codex", { name: "Juez Codex", run: (request) => runJudge(codex, request) }, { ...common, prompt: buildJudgePrompt(common.problem, context, codexResult.stdout, claudeResult.stdout, maxPrompt) });
  assertSuccessful(judgeResult);

  await writeReport(resolve(options.output), common.problem, codexResult.stdout, claudeResult.stdout, judgeResult.stdout);
  console.log(`Informe creado: ${resolve(options.output)}`);
}

async function runAgentStep(label: string, agent: AgentProvider, request: AgentRequest): Promise<AgentResult> {
  console.log(`Ejecutando ${label}...`);
  const rawResult = await agent.run(request);
  const result = rawResult.agent === label ? rawResult : { ...rawResult, agent: label };
  try {
    await writeDebug(resolve("runs"), result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`No se pudo guardar el registro de ${label}: ${message}`);
  }
  return result;
}

function assertSuccessful(result: AgentResult): void {
  if (result.exitCode === 0) return;
  const reason = result.startError
    ? `no pudo iniciarse (${result.startError})`
    : result.timedOut
      ? "excedió el tiempo límite"
      : result.signal
        ? `terminó por señal ${result.signal}`
        : `terminó con exit code ${result.exitCode}`;
  const details = result.stderr.trim();
  throw new Error(`${result.agent} ${reason}.${details ? ` ${details}` : ""}`);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
