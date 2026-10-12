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

## Webhook de Dialogflow

El backend del asistente se ejecuta en otro terminal con:

```bash
npm run dev:webhook
```

El endpoint local es `POST http://localhost:3001/webhook`. Dialogflow ES exige
una URL HTTPS pública, por lo que para conectarlo debes desplegar este servidor
o exponer el puerto `3001` mediante un túnel HTTPS y configurar la URL resultante
en **Fulfillment > Webhook** del agente.

El webhook utiliza `queryResult.action` y admite estas acciones:

- `rutina.crear` con `objetivo`, `nivel` y `dias`;
- `rutina.consultar` para recuperar la última rutina de la misma sesión;
- `ejercicio.consultar` con el parámetro `ejercicio`.

Las rutinas se guardan en memoria por el identificador completo de sesión. Al
reiniciar el servidor se borran; el repositorio está desacoplado para poder
sustituirlo más adelante por almacenamiento persistente.

Para ejecutar las pruebas del webhook:

```bash
npm test
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

La lógica del webhook se encuentra en `server/`, separada en datos, servicios,
repositorio y adaptador HTTP.
