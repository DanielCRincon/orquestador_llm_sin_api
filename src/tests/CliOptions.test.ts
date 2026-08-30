import test from "node:test";
import assert from "node:assert/strict";
import { parseCliOptions, positiveIntegerFromEnv } from "../input/CliOptions";
import { buildAnalysisPrompt, buildJudgePrompt } from "../consensus/ConsensusAgent";
import { CommandAgent } from "../agents/CommandAgent";

test("parseCliOptions accepts repeated files", () => {
  assert.deepEqual(parseCliOptions(["--problem", "Revisar", "--file", "a.ts", "--file", "b.ts", "--out", "result.md"]), {
    problem: "Revisar", files: ["a.ts", "b.ts"], output: "result.md"
  });
});

test("parseCliOptions rejects unknown and incomplete options", () => {
  assert.throws(() => parseCliOptions(["--problem", "x", "--wat"]), /Falta un valor|no reconocida/);
  assert.throws(() => parseCliOptions(["--file", "x.ts"]), /Uso:/);
  assert.throws(() => parseCliOptions(["--problem", "x", "--out", "report.md", "--out", "other.md"]), /solo puede/);
});

test("positiveIntegerFromEnv rejects invalid configured values", () => {
  const previous = process.env.TEST_LIMIT;
  process.env.TEST_LIMIT = "NaN";
  assert.throws(() => positiveIntegerFromEnv("TEST_LIMIT", 10), /entero positivo/);
  process.env.TEST_LIMIT = "25";
  assert.equal(positiveIntegerFromEnv("TEST_LIMIT", 10), 25);
  if (previous === undefined) delete process.env.TEST_LIMIT;
  else process.env.TEST_LIMIT = previous;
});

test("judge prompt gives both proposals a bounded allocation", () => {
  const prompt = buildJudgePrompt("p", "c".repeat(300), "A".repeat(300), "B".repeat(300), 1000);
  assert.ok(prompt.length <= 1000);
  assert.match(prompt, /PROPUESTA CODEX:\nA/);
  assert.match(prompt, /PROPUESTA CLAUDE:\nB/);
});

test("analysis prompt stays within its configured maximum", () => {
  const prompt = buildAnalysisPrompt("rol", "problema", "c".repeat(500), 100);
  assert.ok(prompt.length <= 100);
});

test("CommandAgent executes a Windows executable without cmd.exe", async () => {
  const agent = new CommandAgent("Node", {
    command: process.execPath,
    args: ["--version"],
    timeoutMs: 5_000,
    maxOutputChars: 1_000
  });
  const result = await agent.run({ problem: "", context: "", prompt: "", workingDirectory: process.cwd() });
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /^v\d+/);
});
