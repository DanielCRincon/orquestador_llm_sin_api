import { spawn } from "node:child_process";
import { AgentProvider, AgentRequest, AgentResult } from "./AgentProvider";

export interface CommandAgentOptions {
  command: string;
  args: string[];
  timeoutMs: number;
  maxOutputChars: number;
}

export class CommandAgent implements AgentProvider {
  constructor(public readonly name: string, private readonly options: CommandAgentOptions) {}

  run(request: AgentRequest): Promise<AgentResult> {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const command = this.commandLine();
      const child = spawn(command.file, command.args, {
        cwd: request.workingDirectory,
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";
      let settled = false;
      let timedOut = false;
      let graceTimer: NodeJS.Timeout | undefined;
      const finish = (result: AgentResult) => {
        if (!settled) {
          settled = true;
          resolve({ ...result, durationMs: Date.now() - started });
        }
      };
      const timer = setTimeout(() => {
        timedOut = true;
        stderr += `\nTimeout after ${this.options.timeoutMs} ms.`;
        if (process.platform === "win32" && child.pid) {
          spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true });
        } else {
          child.kill("SIGTERM");
        }
        graceTimer = setTimeout(() => finish({ agent: this.name, stdout, stderr, exitCode: null, durationMs: 0 }), 5000);
      }, this.options.timeoutMs);

      child.stdout.on("data", (chunk: Buffer) => { stdout = appendLimited(stdout, chunk.toString(), this.options.maxOutputChars); });
      child.stderr.on("data", (chunk: Buffer) => { stderr = appendLimited(stderr, chunk.toString(), this.options.maxOutputChars); });
      child.on("error", (error) => {
        clearTimeout(timer);
        if (graceTimer) clearTimeout(graceTimer);
        if (!settled) reject(new Error(`${this.name} no pudo iniciarse: ${error.message}`));
      });
      child.on("close", (exitCode) => {
        clearTimeout(timer);
        if (graceTimer) clearTimeout(graceTimer);
        finish({ agent: this.name, stdout, stderr, exitCode: timedOut ? null : exitCode, durationMs: 0 });
      });
      child.stdin.end(request.prompt);
    });
  }

  private commandLine(): { file: string; args: string[] } {
    if (!this.options.command || /[\r\n"&|<>^()%!]/.test(this.options.command)) {
      throw new Error(`${this.name}: el comando configurado contiene caracteres no permitidos.`);
    }
    if (process.platform !== "win32") return { file: this.options.command, args: this.options.args };
    const commandLine = `"${this.options.command}" ${this.options.args.map(quoteWindowsArgument).join(" ")}`;
    return { file: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", commandLine] };
  }
}

function appendLimited(current: string, incoming: string, maximum: number): string {
  if (current.length >= maximum) return current;
  const marker = "\n[Salida truncada por MAX_AGENT_OUTPUT_CHARS.]";
  const available = maximum - current.length;
  if (incoming.length <= available) return current + incoming;
  return current + incoming.slice(0, Math.max(0, available - marker.length)) + marker.slice(0, available);
}

function quoteWindowsArgument(value: string): string {
  return `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, "$1$1")}"`;
}
