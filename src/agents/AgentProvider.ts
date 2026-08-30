export interface AgentRequest {
  problem: string;
  context: string;
  prompt: string;
  workingDirectory: string;
}

export interface AgentResult {
  agent: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

export interface AgentProvider {
  readonly name: string;
  run(request: AgentRequest): Promise<AgentResult>;
}
