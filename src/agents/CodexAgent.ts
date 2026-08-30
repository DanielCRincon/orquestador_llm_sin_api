import { CommandAgent } from "./CommandAgent";

export class CodexAgent extends CommandAgent {
  constructor(timeoutMs: number, maxOutputChars: number) {
    super("Codex", {
      command: process.env.CODEX_COMMAND || "codex.cmd",
      args: ["exec", "--sandbox", "read-only", "--ask-for-approval", "never", "--ephemeral", "--skip-git-repo-check"],
      timeoutMs,
      maxOutputChars
    });
  }
}
