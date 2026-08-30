# Orquestador de revisión ABAP

CLI local enfocado en código ABAP. Ejecuta Codex CLI y Claude Code CLI en paralelo, y luego Codex como juez. Si el juez detecta una respuesta vacía o un desacuerdo importante, los agentes reciben su evaluación y realizan una ronda adicional de revisión antes de la decisión final. No usa OpenAI API, Anthropic API ni API keys: los CLIs usan sus sesiones autenticadas localmente.

El resultado es una propuesta única de ajuste ABAP, con código listo para revisión. La herramienta no modifica archivos, no se conecta a SAP y no crea transportes: exporta o copia el objeto ABAP a un archivo local antes de analizarlo y luego aplica el cambio mediante tu proceso normal de desarrollo y transporte.

## Requisitos

- Node.js 18+
- `codex` instalado y autenticado
- `claude` instalado y autenticado

El programa no concede herramientas de escritura a los agentes. Codex usa `--sandbox read-only`; Claude usa `--tools ""` y `--permission-mode plan`. Tampoco ejecuta comandos sugeridos por sus respuestas. El contexto de archivos y las propuestas se tratan como contenido no confiable: se indica expresamente a los agentes que no sigan instrucciones incluidas en ellos. Las opciones de Codex se mantienen compatibles con el subcomando `codex exec` actual.

## Instalación y uso

```powershell
npm install
npm run build
npm.cmd start -- --problem "Revisa este objeto ABAP y propone el ajuste solicitado." --file .\ZCL_EJEMPLO.abap --out ajuste-abap.md
```

También se puede omitir `--file` o repetirlo para varios archivos. El informe se escribe en `report.md` por defecto:

```powershell
npm.cmd start -- --problem "Revisa la clase ABAP y su programa llamador." --file .\ZCL_EJEMPLO.abap --file .\ZPROGRAMA.abap --out resultado.md
```

## Solicitar un ajuste ABAP

Guarda o exporta el código desde ADT/SE80 como un archivo `.abap` local. Después describe el resultado esperado, las restricciones relevantes y el formato de respuesta que quieres.

Ejemplo: ajustar un `SELECT` dentro de un método de clase.

```powershell
npm.cmd run build

npm.cmd start -- --problem "En el método GET_ORDERS reemplaza el SELECT dentro del LOOP por una lectura masiva. Conserva el comportamiento funcional, evita SELECT FOR ALL ENTRIES si la tabla está vacía, usa sintaxis ABAP moderna compatible con S/4HANA y devuelve el bloque de código completo que debo reemplazar. Incluye riesgos y casos de prueba." --file "C:\ABAP\ZCL_ORDER_SERVICE.abap" --out "ajuste-get-orders.md"
```

Abre `ajuste-get-orders.md`: contiene una única respuesta final del juez, no los borradores de Codex y Claude. Revisa el código, pruébalo en tu sistema de desarrollo ABAP y crea el transporte con tus herramientas SAP habituales.

Para un cambio repartido en varios objetos, repite `--file`:

```powershell
npm.cmd start -- --problem "Corrige el flujo de validación de pedidos. Devuelve los cambios ABAP por objeto y explica el orden de activación y pruebas." --file "C:\ABAP\ZCL_ORDER_SERVICE.abap" --file "C:\ABAP\ZIF_ORDER_SERVICE.abap" --file "C:\ABAP\ZORDER_REPORT.abap" --out "ajuste-validacion.md"
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
