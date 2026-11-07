import 'dotenv/config';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { handleDialogflowWebhook } from './webhook/dialogflowWebhook.js';

const port = Number(process.env.PORT) || 3001;
const maxBodySize = 1_000_000;
const exerciseAssetsUrl = new URL('../public/assets/exercises/', import.meta.url);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  response.end(statusCode === 204 ? undefined : JSON.stringify(payload));
}

async function sendExerciseAsset(request, response) {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const fileName = decodeURIComponent(pathname.slice('/assets/exercises/'.length));
  if (!/^[a-z0-9-]+\.jpg$/.test(fileName)) {
    sendJson(response, 404, { error: 'Imagen no encontrada.' });
    return;
  }
  try {
    const image = await readFile(new URL(fileName, exerciseAssetsUrl));
    response.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': image.length,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });
    response.end(image);
  } catch (error) {
    if (error?.code !== 'ENOENT') console.error('Error al servir una imagen:', error);
    sendJson(response, 404, { error: 'Imagen no encontrada.' });
  }
}

export const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  if (request.method === 'GET' && request.url?.startsWith('/assets/exercises/')) {
    await sendExerciseAsset(request, response);
    return;
  }
  if (request.method === 'GET' && request.url === '/health') {
    return sendJson(response, 200, { status: 'ok', service: 'aurafit-webhook' });
  }
  if (request.method !== 'POST' || request.url !== '/webhook') {
    return sendJson(response, 404, { error: 'Endpoint no encontrado.' });
  }

  let rawBody = '';
  let bodyTooLarge = false;
  request.setEncoding('utf8');
  request.on('data', (chunk) => {
    rawBody += chunk;
    if (rawBody.length > maxBodySize) bodyTooLarge = true;
  });
  request.on('end', async () => {
    if (bodyTooLarge) {
      sendJson(response, 413, { fulfillmentText: 'La petición es demasiado grande.' });
      return;
    }
    try {
      const result = await handleDialogflowWebhook(JSON.parse(rawBody || '{}'));
      sendJson(response, 200, result);
    } catch (error) {
      console.error('Petición no válida:', error);
      sendJson(response, 400, {
        fulfillmentText: 'No he podido interpretar la petición. Inténtalo de nuevo.',
      });
    }
  });
  request.on('error', (error) => {
    console.error('Error de conexión:', error);
    if (!response.headersSent) {
      sendJson(response, 500, {
        fulfillmentText: 'No he podido completar la operación. Inténtalo de nuevo.',
      });
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`Webhook de AuraFit disponible en http://localhost:${port}/webhook`);
  });
}
