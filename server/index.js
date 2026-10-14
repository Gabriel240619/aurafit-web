import 'dotenv/config';
import http from 'node:http';
import { handleDialogflowWebhook } from './webhook/dialogflowWebhook.js';

const port = Number(process.env.PORT) || 3001;
const maxBodySize = 1_000_000;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  response.end(statusCode === 204 ? undefined : JSON.stringify(payload));
}

export const server = http.createServer((request, response) => {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
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
