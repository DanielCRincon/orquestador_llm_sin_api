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
  timedOut: boolean;
  signal: NodeJS.Signals | null;
  startError?: string;
}

export interface AgentProvider {
  readonly name: string;
  run(request: AgentRequest): Promise<AgentResult>;
}
