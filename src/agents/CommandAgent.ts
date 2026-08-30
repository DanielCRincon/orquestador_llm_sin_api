import { spawn } from "node:child_process";
import { AgentProvider, AgentRequest, AgentResult } from "./AgentProvider";

export interface CommandAgentOptions {
  command: string;
  args: string[];
  timeoutMs: number;
}

export class CommandAgent implements AgentProvider {
  constructor(public readonly name: string, private readonly options: CommandAgentOptions) {}

  run(request: AgentRequest): Promise<AgentResult> {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const child = spawn(this.options.command, this.options.args, {
        cwd: request.workingDirectory,
        shell: true,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";
      let settled = false;
      const finish = (result: AgentResult) => {
        if (!settled) {
          settled = true;
          resolve({ ...result, durationMs: Date.now() - started });
        }
      };
      const timer = setTimeout(() => {
        stderr += `\nTimeout after ${this.options.timeoutMs} ms.`;
        if (process.platform === "win32" && child.pid) {
          spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true });
        } else {
          child.kill("SIGTERM");
        }
        finish({ agent: this.name, stdout, stderr, exitCode: null, durationMs: 0 });
      }, this.options.timeoutMs);

      child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
      child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
      child.on("error", (error) => {
        clearTimeout(timer);
        if (!settled) reject(new Error(`${this.name} no pudo iniciarse: ${error.message}`));
      });
      child.on("close", (exitCode) => {
        clearTimeout(timer);
        finish({ agent: this.name, stdout, stderr, exitCode, durationMs: 0 });
      });
      child.stdin.end(request.prompt);
    });
  }
}
