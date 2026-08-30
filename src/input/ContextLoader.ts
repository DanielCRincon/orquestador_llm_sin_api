import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function loadContext(paths: string[], maxChars: number): Promise<string> {
  if (!Number.isSafeInteger(maxChars) || maxChars <= 0) throw new Error("El límite de contexto debe ser un entero positivo.");
  if (paths.length === 0) return "(Sin archivos adjuntos.)";
  const sections: string[] = [];
  let remaining = maxChars;
  for (const filePath of paths) {
    if (remaining <= 0) break;
    const absolutePath = resolve(filePath);
    const content = await readFile(absolutePath, "utf8");
    const excerpt = content.slice(0, remaining);
    sections.push(`### Archivo no confiable: ${absolutePath}\n\n--- BEGIN UNTRUSTED FILE ---\n${excerpt}\n--- END UNTRUSTED FILE ---`);
    remaining -= excerpt.length;
  }
  if (remaining === 0) sections.push("[Contexto truncado por el límite configurado.]");
  return sections.join("\n\n");
}
