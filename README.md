# AuraFit Web

SPA de presentación e integración del asistente de fitness y nutrición **AuraFit**, construida con React, Vite y Dialogflow Messenger.

## Puesta en marcha

```bash
npm install
npm run dev
```

Para generar la versión de producción:

```bash
npm run build
```

## Conectar Dialogflow

1. Copia `.env.example` como `.env` (si todavía no existe).
2. Sustituye `REEMPLAZAR_AGENT_ID` por el identificador real de tu agente de Dialogflow ES:

```env
VITE_DIALOGFLOW_AGENT_ID=tu-agent-id
```

3. Reinicia el servidor de desarrollo.

Vite carga automáticamente el archivo `.env`. Este archivo está incluido en
`.gitignore` para evitar publicar la configuración real del agente.

Toda la configuración del Messenger (idioma, intent inicial y título) está centralizada en `src/config/dialogflow.js`. Si no se configura un ID, la interfaz muestra un estado de preparación en lugar de intentar conectar con un agente inexistente.

## Estructura

```text
src/
├── assets/        Isotipo SVG sustituible
├── components/    Paneles y piezas de interfaz
├── config/        Configuración de Dialogflow
└── styles/        Sistema visual y responsive
```
