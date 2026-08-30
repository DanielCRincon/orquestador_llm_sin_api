# Guía local de uso

Esta guía es la receta diaria para usar el orquestador con código ABAP exportado desde SAP.

## 1. Abrir el proyecto

Abre PowerShell en la carpeta clonada del repositorio:

```powershell
cd <ruta-del-proyecto>
```

## 2. Primera ejecución

Solo la primera vez, instala dependencias y verifica el entorno:

```powershell
npm.cmd install
npm.cmd test
codex --version
claude --version
```

Si `npm` está bloqueado por PowerShell, usa siempre `npm.cmd`.

## 3. Preparar archivos ABAP

1. Exporta o copia el objeto desde ADT/SE80 a un archivo local `.abap` o `.xml`.
2. Guárdalo dentro de `abap/`.
3. No agregues esa carpeta a Git: ya está incluida en `.gitignore`.

Ejemplo:

```text
abap/
  ZCL_ORDER_SERVICE.abap
  ZIF_ORDER_SERVICE.abap
  ZSMARTFORM_FACTURA.xml
```

## 4. Ejecutar una revisión

Describe el cambio esperado con precisión y proporciona el archivo:

```powershell
npm.cmd start -- --problem "En el método GET_ORDERS reemplaza el SELECT dentro del LOOP por una lectura masiva. Conserva el comportamiento funcional, evita SELECT FOR ALL ENTRIES si la tabla está vacía, usa ABAP compatible con S/4HANA y devuelve el bloque completo que debo reemplazar." --file ".\abap\ZCL_ORDER_SERVICE.abap" --out "ajuste-get-orders.md"
```

El reporte se genera en:

```text
reports/ajuste-get-orders.md
```

## 5. Revisar varios objetos

Repite `--file` si el requerimiento depende de varios objetos:

```powershell
npm.cmd start -- --problem "Ajusta el flujo de validación de pedidos. Devuelve los cambios ABAP por objeto, el orden de activación y las pruebas." --file ".\abap\ZCL_ORDER_SERVICE.abap" --file ".\abap\ZIF_ORDER_SERVICE.abap" --file ".\abap\ZORDER_REPORT.abap" --out "ajuste-validacion.md"
```

## 6. Aplicar el resultado

1. Abre el reporte dentro de `reports/`.
2. Revisa el bloque ABAP final, riesgos y pruebas sugeridas.
3. Lleva el ajuste manualmente a tu ambiente de desarrollo SAP.
4. Ejecuta pruebas y crea el transporte mediante el proceso habitual de tu equipo.

La herramienta no modifica SAP ni crea transportes.

## Opciones útiles

Usar Claude como juez en la ventana actual:

```powershell
$env:JUDGE_PROVIDER = "claude"
```

Volver a Codex como juez:

```powershell
$env:JUDGE_PROVIDER = "codex"
```

Para que el juez disponga de más contexto al revisar muchos archivos:

```powershell
$env:MAX_CONTEXT_CHARS = "60000"
$env:MAX_PROMPT_CHARS = "90000"
```

## Plantilla de requerimiento

```text
En el método <MÉTODO> de <OBJETO>, necesito <CAMBIO>.
Conserva <REGLAS DE NEGOCIO>.
Compatible con <RELEASE/S4HANA/ECC>.
Devuelve el bloque ABAP completo que debo reemplazar, riesgos y pruebas.
```

## Si algo falla

```powershell
npm.cmd test
```

- Si falla `codex` o `claude`, ejecuta `codex --version` y `claude --version` para confirmar instalación y autenticación.
- Si Node no aparece, cierra PowerShell, abre una ventana nueva y ejecuta `node --version`.
- Los detalles técnicos de cada ejecución quedan en `runs/`; esa carpeta no se sube a Git.
