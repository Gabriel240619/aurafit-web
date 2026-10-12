import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemoryRoutineRepository } from '../server/repositories/routineRepository.js';
import { createDialogflowWebhook } from '../server/webhook/dialogflowWebhook.js';

function request(action, parameters = {}, session = 'projects/test/agent/sessions/session-a') {
  return { session, queryResult: { action, parameters } };
}

describe('webhook de Dialogflow', () => {
  it('crea, almacena y recupera exactamente la misma rutina', async () => {
    const repository = new InMemoryRoutineRepository();
    const webhook = createDialogflowWebhook(repository);
    const session = 'projects/test/agent/sessions/user-1';
    const created = await webhook(request('rutina.crear', {
      objetivo: 'ganar_musculo', nivel: 'intermedio', dias: 4,
    }, session));
    const storedBeforeQuery = repository.getRoutine(session);
    const queried = await webhook(request('rutina.consultar', {}, session));

    assert.equal(storedBeforeQuery.dias, 4);
    assert.equal(storedBeforeQuery.plan.length, 4);
    assert.deepEqual(repository.getRoutine(session), storedBeforeQuery);
    assert.match(created.fulfillmentText, /ganar musculo/i);
    assert.equal(queried.fulfillmentText, created.fulfillmentText);
  });

  it('indica que no existe rutina para una sesión nueva', async () => {
    const webhook = createDialogflowWebhook(new InMemoryRoutineRepository());
    const response = await webhook(request('rutina.consultar'));
    assert.match(response.fulfillmentText, /no tienes una rutina/i);
  });

  it('valida que los días estén entre 1 y 7', async () => {
    const webhook = createDialogflowWebhook(new InMemoryRoutineRepository());
    const response = await webhook(request('rutina.crear', {
      objetivo: 'resistencia', nivel: 'principiante', dias: 8,
    }));
    assert.match(response.fulfillmentText, /entre 1 y 7/i);
  });

  it('devuelve texto, descripción e imagen para la sentadilla', async () => {
    const webhook = createDialogflowWebhook(new InMemoryRoutineRepository());
    const response = await webhook(request('ejercicio.consultar', { ejercicio: 'Sentadilla' }));
    const richContent = response.fulfillmentMessages[0].payload.richContent[0];
    assert.match(response.fulfillmentText, /sentadilla/i);
    assert.equal(richContent[0].type, 'image');
    assert.match(richContent[0].rawUrl, /^https:\/\//);
    assert.equal(richContent[1].type, 'description');
  });
});
