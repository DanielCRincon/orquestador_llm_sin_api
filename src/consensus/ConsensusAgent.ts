import { AgentProvider, AgentRequest, AgentResult } from "../agents/AgentProvider";

export function buildAnalysisPrompt(role: string, problem: string, context: string, maxChars: number): string {
  return `${role}\n\nPROBLEMA:\n${problem}\n\nCONTEXTO:\n${context}`.slice(0, maxChars);
}

export function buildJudgePrompt(problem: string, context: string, codex: string, claude: string, maxChars: number): string {
  return `Actúa como juez técnico independiente. Analiza el problema y las dos propuestas siguientes. Identifica coincidencias, desacuerdos importantes y cuál está mejor fundamentada. Combina las mejores partes solo cuando corresponda. No inventes consenso. Produce exactamente estas secciones Markdown: ## Agreements, ## Disagreements, ## Final Recommendation, ## Risks, ## Suggested Tests.\n\nPROBLEMA:\n${problem}\n\nCONTEXTO:\n${context}\n\nPROPUESTA CODEX:\n${codex}\n\nPROPUESTA CLAUDE:\n${claude}`.slice(0, maxChars);
}

export async function runJudge(provider: AgentProvider, request: AgentRequest): Promise<AgentResult> {
  return provider.run(request);
}
