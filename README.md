# AuraFit

AuraFit es un chatbot académico de fitness y seguimiento básico de alimentación construido con React, Vite, Dialogflow ES, Dialogflow Messenger y un webhook Node.js.

## Instalación y arranque

Instala exactamente las dependencias registradas:

```bash
npm ci
```

Arranca el frontend:

```bash
npm run dev
```

En otra terminal, arranca el webhook:

```bash
npm run dev:webhook
```

Por defecto, la web estará en `http://localhost:5173` y el webhook en `http://localhost:3001`.

## Variables de entorno

Copia `.env.example` como `.env` y completa los valores necesarios:

```env
VITE_DIALOGFLOW_AGENT_ID=REEMPLAZAR_AGENT_ID
USDA_FDC_API_KEY=REEMPLAZAR_API_KEY
USDA_FDC_BASE_URL=https://api.nal.usda.gov/fdc/v1
PORT=3001
```

- `VITE_DIALOGFLOW_AGENT_ID`: ID del agente de Dialogflow ES usado por el frontend.
- `USDA_FDC_API_KEY`: clave de USDA FoodData Central. Debe obtenerse en su portal y no se versiona.
- `USDA_FDC_BASE_URL`: URL base de la API nutricional.
- `PORT`: puerto del webhook Node.js.
- `PUBLIC_BASE_URL`: origen público opcional que sirve las imágenes (sin `/webhook`). Por defecto se usan rutas `/assets/exercises/` del mismo origen que la web: Vite las sirve desde `public/` y la compilación las copia a `dist/`. Así las imágenes no dependen del túnel de ngrok. Si usas Messenger fuera de esta web, configura aquí un origen HTTPS accesible que sirva esos archivos.

Vite carga la configuración del frontend. El webhook carga explícitamente `.env` mediante `dotenv` y usa el almacén de certificados del sistema para las conexiones HTTPS salientes. Los archivos `.env` y `.env.local` están ignorados por Git.

## Webhook de Dialogflow

El servidor ofrece:

- `POST /webhook`: fulfillment de Dialogflow ES.
- `GET /health`: comprobación de disponibilidad, con respuesta `{"status":"ok","service":"aurafit-webhook"}`.
- `GET /assets/exercises/:archivo.jpg`: imágenes locales usadas en las fichas de ejercicios.

Acciones gestionadas:

- `rutina.crear`
- `rutina.consultar`
- `ejercicio.consultar`
- `entrenamiento.registrar`
- `nutricion.registrar`
- `nutricion.resumen`
- `nutricion.consultar_calorias`
- `progreso.resumen`

El estado se guarda en memoria usando el valor completo de la sesión de Dialogflow. Rutinas, entrenamientos y comidas quedan aislados por sesión, pero se pierden al reiniciar el webhook. Los resúmenes diarios usan la zona `Europe/Madrid`.

Dialogflow exige un endpoint HTTPS público. Para desarrollo puedes exponer el puerto `3001` con ngrok:

```bash
ngrok http 3001
```

Configura en **Fulfillment > Webhook** la URL pública seguida de `/webhook`. Una URL gratuita de ngrok es temporal y no debe considerarse una dirección permanente de entrega.

Las fichas de ejercicios separan la imagen y la descripción en tarjetas distintas. Messenger oculta una tarjeta completa si falla su imagen; esta separación mantiene visibles los músculos, la técnica y los errores incluso si la imagen no carga. Para probar desde la web local, deja `PUBLIC_BASE_URL` vacío o sin definir. Si solo aparecen los botones con una versión anterior del webhook, reinícialo y repite la consulta.

## Agente de Dialogflow

El agente actualizado y listo para importar está en:

```text
dialogflow/AuraFit-actualizado.zip
```

Su contenido fuente se conserva en `dialogflow-agent/`. El export tiene activado el webhook en todas las acciones dinámicas, entidades alineadas con el backend y frases adicionales para consultar ejercicios.

Para regenerar el ZIP en Windows usa el script incluido. Este normaliza las rutas internas con `/`, como exige Dialogflow:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\build-dialogflow-zip.ps1
```

No uses `Compress-Archive` directamente para este export: puede guardar las rutas internas con `\` y Dialogflow no reconocerá las carpetas `intents/` y `entities/`.

El ZIP no contiene una URL de webhook para evitar conservar un túnel de ngrok caducado. Después de importarlo:

1. abre **Fulfillment**;
2. activa el webhook;
3. introduce tu URL HTTPS pública terminada en `/webhook`;
4. pulsa **Save**;
5. revisa **Validation** y prueba las rich responses en Dialogflow Messenger.

## Información nutricional

`nutricion.consultar_calorias` utiliza la API real de USDA FoodData Central. El servicio:

- traduce un conjunto pequeño y explícito de aliases frecuentes del español al inglés;
- prioriza alimentos genéricos frente a productos de marca;
- extrae energía, proteína, carbohidratos, grasa y fibra;
- aplica un timeout de 3,5 segundos para dejar margen al límite de cinco segundos del webhook de Dialogflow ES;
- responde de forma conversacional si falta la clave, no hay resultados o la API falla.

Los resultados son valores orientativos, normalmente expresados por 100 g, y pueden variar según el producto y la preparación.

## Pruebas y compilación

```bash
npm test
npm run build
```

Las pruebas nutricionales usan un cliente inyectado y respuestas simuladas; no consumen la API real ni requieren una clave para ejecutarse.

## Estructura principal

```text
src/                         Frontend React y Dialogflow Messenger
server/data/                 Catálogo de ejercicios y plantillas de rutina
server/repositories/         Estado en memoria por sesión
server/services/             Rutinas, actividad y cliente USDA
server/webhook/              Router y respuestas de Dialogflow Messenger
test/                        Pruebas automatizadas
dialogflow-agent/            Fuente del export actualizado de Dialogflow ES
dialogflow/                  ZIP importable del agente
```
