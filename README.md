# Multi-agent orchestrator MVP

CLI local en TypeScript que ejecuta, en orden, Codex CLI, Claude Code CLI y Codex como juez. No usa OpenAI API, Anthropic API ni API keys: los CLIs usan sus sesiones autenticadas localmente.

## Requisitos

- Node.js 18+
- `codex` instalado y autenticado
- `claude` instalado y autenticado

El programa no concede herramientas de escritura a los agentes. Codex usa `--sandbox read-only`; Claude usa `--tools ""` y `--permission-mode plan`. Tampoco ejecuta comandos sugeridos por sus respuestas.

## Instalación y uso

```powershell
npm install
npm run build
npm start -- --problem "Explica cómo corregir este bug de concurrencia" --file .\src\ejemplo.ts
```

También se puede omitir `--file` o repetirlo para varios archivos. El informe se escribe en `report.md` por defecto:

```powershell
npm start -- --problem "Revisa este diseño" --file .\src\a.ts --file .\src\b.ts --out resultado.md
```

Variables opcionales: `CODEX_COMMAND`, `CLAUDE_COMMAND`, `AGENT_TIMEOUT_MS` (por defecto 180000), `MAX_CONTEXT_CHARS` (por defecto 12000) y `MAX_PROMPT_CHARS` (por defecto 30000).

Las respuestas completas y los metadatos de cada ejecución se guardan en `runs/` para depuración. Si un CLI no está instalado, no está autenticado, termina con error o excede el timeout, el proceso termina con un mensaje accionable y no genera un informe parcial.
