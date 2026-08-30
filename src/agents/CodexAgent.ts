import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { CommandAgent } from "./CommandAgent";

export class CodexAgent extends CommandAgent {
  constructor(timeoutMs: number, maxOutputChars: number) {
    super("Codex", {
      command: resolveCodexCommand(),
      args: ["exec", "--sandbox", "read-only", "--ephemeral", "--skip-git-repo-check"],
      timeoutMs,
      maxOutputChars
    });
  }
}

function resolveCodexCommand(): string {
  if (process.env.CODEX_COMMAND) return process.env.CODEX_COMMAND;
  if (process.platform !== "win32") return "codex";

  const pathCommand = findCodexOnPath();
  if (pathCommand) return pathCommand;

  const extensionsDirectory = join(homedir(), ".vscode", "extensions");
  try {
    const candidates = readdirSync(extensionsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("openai.chatgpt-"))
      .map((entry) => join(extensionsDirectory, entry.name, "bin", "windows-x86_64", "codex.exe"))
      .filter((path) => existsSync(path))
      .sort();
    return candidates.at(-1) || "codex";
  } catch {
    return "codex";
  }
}

function findCodexOnPath(): string | undefined {
  const pathValue = process.env.PATH || process.env.Path;
  if (!pathValue) return undefined;
  for (const directory of pathValue.split(delimiter).filter(Boolean)) {
    for (const executable of ["codex.exe", "codex.cmd", "codex.bat", "codex"]) {
      const candidate = join(directory, executable);
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}
