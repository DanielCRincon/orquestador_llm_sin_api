import { resolve } from "node:path";
import { CodexAgent } from "./agents/CodexAgent";
import { ClaudeAgent } from "./agents/ClaudeAgent";
import { AgentProvider, AgentRequest, AgentResult } from "./agents/AgentProvider";
import { loadContext } from "./input/ContextLoader";
import { parseCliOptions, positiveIntegerFromEnv } from "./input/CliOptions";
import { buildAnalysisPrompt, buildJudgePrompt, buildRevisionPrompt, needsRevision, runJudge } from "./consensus/ConsensusAgent";
import { writeDebug, writeReport } from "./output/ReportWriter";

const ANALYSIS_INSTRUCTIONS = "Analiza independientemente el problema. Propón solución, riesgos y pruebas. No modifiques archivos ni ejecutes comandos. No tienes acceso a otra propuesta.";

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const maxContext = positiveIntegerFromEnv("MAX_CONTEXT_CHARS", 12000);
  const maxPrompt = positiveIntegerFromEnv("MAX_PROMPT_CHARS", 30000);
  const timeoutMs = positiveIntegerFromEnv("AGENT_TIMEOUT_MS", 180000);
  const maxOutputChars = positiveIntegerFromEnv("MAX_AGENT_OUTPUT_CHARS", 1_000_000);
  const maxConsensusRounds = positiveIntegerFromEnv("MAX_CONSENSUS_ROUNDS", 1);
  const context = await loadContext(options.files, maxContext);
  const workingDirectory = process.cwd();
  const codex = new CodexAgent(timeoutMs, maxOutputChars);
  const claude = new ClaudeAgent(timeoutMs, maxOutputChars);
  const common = { problem: options.problem, context, workingDirectory };

  let [codexResult, claudeResult] = await Promise.all([
    runAgentStep("Codex", codex, { ...common, prompt: buildAnalysisPrompt(ANALYSIS_INSTRUCTIONS, common.problem, context, maxPrompt) }),
    runAgentStep("Claude", claude, { ...common, prompt: buildAnalysisPrompt(ANALYSIS_INSTRUCTIONS, common.problem, context, maxPrompt) })
  ]);
  assertSuccessful(codexResult);
  assertSuccessful(claudeResult);

  let judgeResult = await judge(codex, common, codexResult.stdout, claudeResult.stdout, maxPrompt, maxConsensusRounds === 0, 0);
  assertSuccessful(judgeResult);

  for (let round = 1; round <= maxConsensusRounds && needsRevision(judgeResult.stdout); round += 1) {
    console.log(`El juez solicita revisión de consenso (ronda ${round}/${maxConsensusRounds})...`);
    [codexResult, claudeResult] = await Promise.all([
      runAgentStep(`Codex revisión ${round}`, codex, { ...common, prompt: buildRevisionPrompt(ANALYSIS_INSTRUCTIONS, common.problem, context, codexResult.stdout, judgeResult.stdout, maxPrompt) }),
      runAgentStep(`Claude revisión ${round}`, claude, { ...common, prompt: buildRevisionPrompt(ANALYSIS_INSTRUCTIONS, common.problem, context, claudeResult.stdout, judgeResult.stdout, maxPrompt) })
    ]);
    assertSuccessful(codexResult);
    assertSuccessful(claudeResult);
    judgeResult = await judge(codex, common, codexResult.stdout, claudeResult.stdout, maxPrompt, round === maxConsensusRounds, round);
    assertSuccessful(judgeResult);
  }

  await writeReport(resolve(options.output), common.problem, judgeResult.stdout);
  console.log(`Informe creado: ${resolve(options.output)}`);
}

async function judge(codex: CodexAgent, common: Omit<AgentRequest, "prompt">, codexAnswer: string, claudeAnswer: string, maxPrompt: number, forceFinal: boolean, round: number): Promise<AgentResult> {
  const suffix = round === 0 ? "" : ` (ronda ${round})`;
  return runAgentStep(`juez Codex${suffix}`, { name: "Juez Codex", run: (request) => runJudge(codex, request) }, {
    ...common,
    prompt: buildJudgePrompt(common.problem, common.context, codexAnswer, claudeAnswer, maxPrompt, forceFinal)
  });
}

async function runAgentStep(label: string, agent: AgentProvider, request: AgentRequest): Promise<AgentResult> {
  console.log(`Ejecutando ${label}...`);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const rawResult = await agent.run(request);
    const result = rawResult.agent === label ? rawResult : { ...rawResult, agent: label };
    await writeDebugBestEffort(label, result);
    if (result.exitCode !== 0 || result.stdout.trim() || attempt === 1) return result;
    console.warn(`${label} devolvió una respuesta vacía; reintentando una vez...`);
  }
  throw new Error(`No se pudo obtener una respuesta de ${label}.`);
}

async function writeDebugBestEffort(label: string, result: AgentResult): Promise<void> {
  try {
    await writeDebug(resolve("runs"), result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`No se pudo guardar el registro de ${label}: ${message}`);
  }
}

function assertSuccessful(result: AgentResult): void {
  if (result.exitCode === 0 && result.stdout.trim()) return;
  const reason = result.startError
    ? `no pudo iniciarse (${result.startError})`
    : result.timedOut
      ? "excedió el tiempo límite"
      : result.signal
        ? `terminó por señal ${result.signal}`
        : result.exitCode === 0
          ? "devolvió una respuesta vacía después de reintentar"
          : `terminó con exit code ${result.exitCode}`;
  const details = result.stderr.trim();
  throw new Error(`${result.agent} ${reason}.${details ? ` ${details}` : ""}`);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
