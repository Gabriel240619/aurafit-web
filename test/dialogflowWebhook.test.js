import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { exercises } from '../server/data/exercises.js';
import { InMemorySessionRepository } from '../server/repositories/sessionRepository.js';
import { createDialogflowWebhook } from '../server/webhook/dialogflowWebhook.js';

const fixedDate = new Date('2026-10-14T12:00:00.000Z');
const silentLogger = { error() {} };

function request(action, parameters = {}, session = 'projects/test/agent/sessions/session-a') {
  return { session, queryResult: { action, parameters } };
}

function setup(nutritionResult = null) {
  const repository = new InMemorySessionRepository();
  const nutritionClient = {
    async lookupNutrition() {
      if (nutritionResult instanceof Error) throw nutritionResult;
      return nutritionResult;
    },
  };
  const webhook = createDialogflowWebhook({
    repository,
    nutritionClient,
    logger: silentLogger,
    now: () => fixedDate,
    publicBaseUrl: 'https://aurafit.test',
  });
  return { repository, webhook };
}

describe('webhook de Dialogflow', () => {
  it('dispone de un JPEG válido para cada ejercicio en los archivos de la web', async () => {
    for (const exercise of exercises) {
      const image = await readFile(new URL(`../public${exercise.imagePath}`, import.meta.url));
      assert.equal(image.readUInt16BE(0), 0xffd8, exercise.id);
      assert.equal(image.readUInt16BE(image.length - 2), 0xffd9, exercise.id);
    }
  });
  it('crea y recupera exactamente la misma rutina', async () => {
    const { repository, webhook } = setup();
    const session = 'projects/test/agent/sessions/user-1';
    const created = await webhook(request('rutina.crear', {
      objetivo: 'ganar_musculo', nivel: 'intermedio', dias: 4,
    }, session));
    const stored = repository.getRoutine(session);
    const queried = await webhook(request('rutina.consultar', {}, session));
    assert.equal(stored.plan.length, 4);
    assert.match(created.fulfillmentText, /ganar musculo/i);
    assert.equal(queried.fulfillmentText, created.fulfillmentText);
  });

  it('aísla la rutina entre sesiones', async () => {
    const { webhook } = setup();
    await webhook(request('rutina.crear', {
      objetivo: 'mantener', nivel: 'principiante', dias: 2,
    }, 'session-one'));
    const response = await webhook(request('rutina.consultar', {}, 'session-two'));
    assert.match(response.fulfillmentText, /no tienes una rutina/i);
  });

  it('valida objetivos canónicos y días entre 1 y 7', async () => {
    const { webhook } = setup();
    const badDays = await webhook(request('rutina.crear', {
      objetivo: 'perder_grasa', nivel: 'principiante', dias: 8,
    }));
    const badObjective = await webhook(request('rutina.crear', {
      objetivo: 'resistencia', nivel: 'principiante', dias: 3,
    }));
    assert.match(badDays.fulfillmentText, /entre 1 y 7/i);
    assert.match(badObjective.fulfillmentText, /ganar músculo, perder grasa o mantener/i);
  });

  it('encuentra todos los ejercicios canónicos principales con rich response', async () => {
    const { webhook } = setup();
    const exerciseIds = [
      'sentadilla', 'press_banca', 'press_militar', 'dominadas', 'remo',
      'peso_muerto', 'peso_muerto_rumano', 'zancadas', 'plancha',
    ];
    for (const ejercicio of exerciseIds) {
      const response = await webhook(request('ejercicio.consultar', { ejercicio }));
      const cards = response.fulfillmentMessages[0].payload.richContent;
      const blocks = cards.flat();
      assert.ok(blocks.some((block) => block.type === 'description'), ejercicio);
      const image = blocks.find((block) => block.type === 'image');
      assert.match(image.rawUrl, /^https:\/\/aurafit\.test\/assets\/exercises\/.+\.jpg$/);
      assert.ok(!cards.find((card) => card.includes(image))
        .some((block) => block.type === 'description'),
      'Una imagen rota no debe ocultar la información del ejercicio');
    }
  });

  it('sirve la imagen desde la web sin depender del host del túnel del webhook', async () => {
    const webhook = createDialogflowWebhook({ publicBaseUrl: '', logger: silentLogger });
    const response = await webhook(request('ejercicio.consultar', { ejercicio: 'press militar' }), {
      publicBaseUrl: 'https://tunel-caducado.ngrok-free.app',
    });
    const blocks = response.fulfillmentMessages[0].payload.richContent.flat();
    assert.equal(blocks.find((block) => block.type === 'image').rawUrl,
      '/assets/exercises/press-militar.jpg');
    const description = blocks.find((block) => block.type === 'description');
    assert.equal(description.title, 'Press militar');
    assert.ok(description.text.some((line) => line.startsWith('Técnica:')));
    assert.ok(description.text.some((line) => line.startsWith('Errores frecuentes:')));
  });

  it('devuelve fallback para un ejercicio desconocido', async () => {
    const { webhook } = setup();
    const response = await webhook(request('ejercicio.consultar', { ejercicio: 'salto lunar' }));
    assert.match(response.fulfillmentText, /no encuentro/i);
  });

  it('registra entrenamiento con duración', async () => {
    const { repository, webhook } = setup();
    const response = await webhook(request('entrenamiento.registrar', {
      tipo_entrenamiento: 'cardio', duracion: 30,
    }));
    assert.match(response.fulfillmentText, /cardio.*30 minutos/i);
    assert.deepEqual(repository.getWorkouts('projects/test/agent/sessions/session-a')[0], {
      type: 'cardio', durationMinutes: 30, createdAt: fixedDate.toISOString(),
    });
  });

  it('permite registrar entrenamiento sin duración', async () => {
    const { repository, webhook } = setup();
    await webhook(request('entrenamiento.registrar', { tipo_entrenamiento: 'tren_superior' }));
    assert.equal(repository.getWorkouts('projects/test/agent/sessions/session-a')[0].durationMinutes, null);
  });

  it('rechaza una duración inválida de forma conversacional', async () => {
    const { repository, webhook } = setup();
    const response = await webhook(request('entrenamiento.registrar', {
      tipo_entrenamiento: 'cardio', duracion: 0,
    }));
    assert.match(response.fulfillmentText, /número positivo/i);
    assert.equal(repository.getWorkouts('projects/test/agent/sessions/session-a').length, 0);
  });

  it('registra una comida con su tipo', async () => {
    const { repository, webhook } = setup();
    const response = await webhook(request('nutricion.registrar', {
      tipo_comida: 'desayuno', alimento: 'avena con plátano',
    }));
    assert.match(response.fulfillmentText, /avena con plátano.*desayuno/i);
    assert.equal(repository.getMeals('projects/test/agent/sessions/session-a')[0].mealType, 'desayuno');
  });

  it('muestra resumen de alimentación vacío', async () => {
    const { webhook } = setup();
    const response = await webhook(request('nutricion.resumen'));
    assert.match(response.fulfillmentText, /no has registrado alimentos hoy/i);
  });

  it('muestra registros reales agrupados por tipo de comida', async () => {
    const { webhook } = setup();
    await webhook(request('nutricion.registrar', { tipo_comida: 'desayuno', alimento: 'avena' }));
    await webhook(request('nutricion.registrar', { tipo_comida: 'comida', alimento: 'arroz con pollo' }));
    const response = await webhook(request('nutricion.resumen'));
    assert.match(response.fulfillmentText, /Desayuno: avena/);
    assert.match(response.fulfillmentText, /Comida: arroz con pollo/);
  });

  it('combina entrenamiento y alimentación en el progreso diario', async () => {
    const { webhook } = setup();
    await webhook(request('entrenamiento.registrar', { tipo_entrenamiento: 'cardio', duracion: 25 }));
    await webhook(request('nutricion.registrar', { tipo_comida: 'merienda', alimento: 'yogur' }));
    const response = await webhook(request('progreso.resumen'));
    assert.match(response.fulfillmentText, /cardio.*25 min/i);
    assert.match(response.fulfillmentText, /merienda: yogur/i);
  });

  it('devuelve datos nutricionales cuando el cliente responde', async () => {
    const { webhook } = setup({
      query: 'plátano', matchedFood: 'Bananas, raw', servingDescription: 'Valores aproximados por 100 g',
      caloriesKcal: 89, proteinG: 1.1, carbsG: 22.8, fatG: 0.3, fiberG: 2.6,
    });
    const response = await webhook(request('nutricion.consultar_calorias', { alimento: 'plátano' }));
    assert.match(response.fulfillmentText, /89 kcal/);
    assert.match(response.fulfillmentText, /Bananas, raw/);
  });

  it('controla una consulta nutricional sin resultados', async () => {
    const { webhook } = setup(null);
    const response = await webhook(request('nutricion.consultar_calorias', { alimento: 'desconocido' }));
    assert.match(response.fulfillmentText, /no he encontrado/i);
  });

  it('mantiene JSON válido si el cliente nutricional falla', async () => {
    const error = Object.assign(new Error('timeout'), { code: 'TIMEOUT' });
    const { webhook } = setup(error);
    const response = await webhook(request('nutricion.consultar_calorias', { alimento: 'banana' }));
    assert.match(response.fulfillmentText, /no he podido obtener/i);
    assert.ok(Array.isArray(response.fulfillmentMessages));
  });

  it('controla acción desconocida y petición sin sesión', async () => {
    const { webhook } = setup();
    const unknown = await webhook(request('accion.desconocida'));
    const noSession = await webhook({ queryResult: { action: 'rutina.consultar', parameters: {} } });
    assert.match(unknown.fulfillmentText, /no puedo gestionar/i);
    assert.match(noSession.fulfillmentText, /identificar la sesión/i);
  });
});
