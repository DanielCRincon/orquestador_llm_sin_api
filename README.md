# Multi-agent orchestrator MVP

CLI local en TypeScript que ejecuta Codex CLI y Claude Code CLI en paralelo, y luego Codex como juez. Si el juez detecta una respuesta vacía o un desacuerdo importante, los agentes reciben su evaluación y realizan una ronda adicional de revisión antes de la decisión final. No usa OpenAI API, Anthropic API ni API keys: los CLIs usan sus sesiones autenticadas localmente.

## Requisitos

- Node.js 18+
- `codex` instalado y autenticado
- `claude` instalado y autenticado

El programa no concede herramientas de escritura a los agentes. Codex usa `--sandbox read-only`; Claude usa `--tools ""` y `--permission-mode plan`. Tampoco ejecuta comandos sugeridos por sus respuestas. El contexto de archivos y las propuestas se tratan como contenido no confiable: se indica expresamente a los agentes que no sigan instrucciones incluidas en ellos. Las opciones de Codex se mantienen compatibles con el subcomando `codex exec` actual.

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

## Configuración y límites

Variables opcionales:

- `CODEX_COMMAND` y `CLAUDE_COMMAND`: ejecutable o ruta local del CLI. Codex busca primero una ruta indicada por `CODEX_COMMAND`, después la instalación de la extensión de VS Code en Windows y finalmente `codex` en el `PATH`; Claude usa `claude.exe`. Por seguridad no se aceptan comillas, saltos de línea ni metacaracteres de shell.
- `AGENT_TIMEOUT_MS`: entero positivo; por defecto `180000`.
- `MAX_CONTEXT_CHARS`: entero positivo; por defecto `12000`.
- `MAX_PROMPT_CHARS`: entero positivo; por defecto `30000`.
- `MAX_AGENT_OUTPUT_CHARS`: máximo de caracteres capturados por `stdout` o `stderr` de cada agente; por defecto `1000000`.
- `MAX_CONSENSUS_ROUNDS`: máximo de rondas adicionales de revisión solicitadas por el juez; por defecto `1`.

El juez reparte el presupuesto del prompt entre contexto (25 %) y ambas propuestas, por lo que ninguna propuesta desaparece por un truncamiento global. Las salidas que excedan el límite se marcan como truncadas.

En Windows, los ejecutables se invocan directamente. Solo los CLIs configurados como `.cmd` o `.bat` se ejecutan mediante `cmd.exe` con argumentos escapados; no se ejecuta una cadena de comando configurable directamente en el shell.

## Pruebas

```powershell
npm test
```

Si PowerShell bloquea `npm.ps1`, usa `npm.cmd` (por ejemplo, `npm.cmd test`) o ejecuta `Set-ExecutionPolicy -Scope Process Bypass` solo para la ventana actual.

Las pruebas cubren el análisis de argumentos, validación de variables de entorno y presupuestos de prompts.

El proyecto usa resolución de módulos `Node16`, compatible con Node.js 18+ y TypeScript 6; no requiere silenciar advertencias de deprecación.

El informe indicado con `--out` contiene solo la respuesta final del juez. Las respuestas completas de cada agente, las revisiones y los metadatos se guardan en `runs/` para depuración. Cada archivo recibe un UUID para evitar colisiones durante la ejecución paralela. Si un agente devuelve texto vacío, se reintenta una sola vez; si vuelve a ocurrir, la ejecución falla con un diagnóstico.

Si un CLI no está instalado, no está autenticado, termina con error o excede el timeout, el proceso termina con un diagnóstico que distingue entre error de inicio, timeout, señal y código de salida. No se genera un informe parcial, pero Codex y Claude terminan sus intentos en paralelo antes de informar el fallo.
