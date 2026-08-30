export interface CliOptions {
  problem: string;
  files: string[];
  output: string;
}

const usage = 'Uso: npm start -- --problem "..." [--file ruta] [--out report.md]';

export function parseCliOptions(args: string[]): CliOptions {
  let problem: string | undefined;
  let output = "report.md";
  let hasOutput = false;
  const files: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === "--help" || option === "-h") throw new Error(usage);
    if (option !== "--problem" && option !== "--file" && option !== "--out") {
      throw new Error(`Opción no reconocida: ${option}. ${usage}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Falta un valor para ${option}. ${usage}`);
    index += 1;
    if (option === "--problem") {
      if (problem) throw new Error(`--problem solo puede indicarse una vez. ${usage}`);
      problem = value;
    } else if (option === "--file") {
      files.push(value);
    } else {
      if (hasOutput) throw new Error(`--out solo puede indicarse una vez. ${usage}`);
      output = value;
      hasOutput = true;
    }
  }
  if (!problem) throw new Error(usage);
  return { problem, files, output };
}

export function positiveIntegerFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} debe ser un entero positivo; se recibió ${JSON.stringify(raw)}.`);
  }
  return value;
}
