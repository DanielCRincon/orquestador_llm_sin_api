import { CommandAgent } from "./CommandAgent";

export class ClaudeAgent extends CommandAgent {
  constructor(timeoutMs: number, maxOutputChars: number) {
    super("Claude", {
      command: process.env.CLAUDE_COMMAND || "claude.exe",
      args: ["--print", "--tools", "", "--permission-mode", "plan", "--no-session-persistence"],
      timeoutMs,
      maxOutputChars
    });
  }
}
