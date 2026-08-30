import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function loadContext(paths: string[], maxChars: number): Promise<string> {
  if (paths.length === 0) return "(Sin archivos adjuntos.)";
  const sections: string[] = [];
  let remaining = maxChars;
  for (const filePath of paths) {
    if (remaining <= 0) break;
    const absolutePath = resolve(filePath);
    const content = await readFile(absolutePath, "utf8");
    const excerpt = content.slice(0, remaining);
    sections.push(`### ${absolutePath}\n\n` + "```\n" + excerpt + "\n```");
    remaining -= excerpt.length;
  }
  if (remaining === 0) sections.push("[Contexto truncado por el límite configurado.]");
  return sections.join("\n\n");
}
