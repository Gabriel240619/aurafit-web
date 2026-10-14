import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createNutritionService,
  normalizeFoodSearchQuery,
  NutritionServiceError,
} from '../server/services/nutritionService.js';

function response({ ok = true, status = 200, payload = {} } = {}) {
  return { ok, status, async json() { return payload; } };
}

const banana = {
  description: 'Bananas, raw',
  dataType: 'Foundation',
  foodNutrients: [
    { nutrientId: 1008, nutrientName: 'Energy', value: 89 },
    { nutrientId: 1003, nutrientName: 'Protein', value: 1.1 },
    { nutrientId: 1005, nutrientName: 'Carbohydrate, by difference', value: 22.8 },
    { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 0.3 },
    { nutrientId: 1079, nutrientName: 'Fiber, total dietary', value: 2.6 },
  ],
};

describe('servicio USDA FoodData Central', () => {
  it('normaliza aliases españoles y cantidades', () => {
    assert.equal(normalizeFoodSearchQuery('plátano'), 'banana');
    assert.equal(normalizeFoodSearchQuery('100 gramos de pechuga de pollo'), 'chicken breast');
    assert.equal(normalizeFoodSearchQuery('manzana'), 'apple');
  });

  it('prioriza alimento genérico y extrae kcal y macros', async () => {
    let requestedUrl;
    const service = createNutritionService({
      apiKey: 'test-key',
      fetchImpl: async (url) => {
        requestedUrl = url;
        return response({ payload: { foods: [
          { ...banana, description: 'Brand banana snack', dataType: 'Branded' },
          banana,
        ] } });
      },
    });
    const result = await service.lookupNutrition('plátano');
    assert.equal(requestedUrl.searchParams.get('query'), 'banana');
    assert.equal(result.matchedFood, 'Bananas, raw');
    assert.deepEqual(
      [result.caloriesKcal, result.proteinG, result.carbsG, result.fatG, result.fiberG],
      [89, 1.1, 22.8, 0.3, 2.6],
    );
  });

  it('representa un nutriente ausente como null', async () => {
    const withoutFiber = { ...banana, foodNutrients: banana.foodNutrients.slice(0, -1) };
    const service = createNutritionService({
      apiKey: 'test-key', fetchImpl: async () => response({ payload: { foods: [withoutFiber] } }),
    });
    assert.equal((await service.lookupNutrition('banana')).fiberG, null);
  });

  it('devuelve null para una lista vacía', async () => {
    const service = createNutritionService({
      apiKey: 'test-key', fetchImpl: async () => response({ payload: { foods: [] } }),
    });
    assert.equal(await service.lookupNutrition('banana'), null);
  });

  it('distingue API key ausente y error HTTP', async () => {
    const missingKey = createNutritionService({ apiKey: '', fetchImpl: async () => response() });
    await assert.rejects(() => missingKey.lookupNutrition('banana'), (error) =>
      error instanceof NutritionServiceError && error.code === 'MISSING_API_KEY');
    const httpError = createNutritionService({
      apiKey: 'test-key', fetchImpl: async () => response({ ok: false, status: 503 }),
    });
    await assert.rejects(() => httpError.lookupNutrition('banana'), (error) => error.code === 'HTTP_ERROR');
  });

  it('controla una respuesta JSON inválida', async () => {
    const service = createNutritionService({
      apiKey: 'test-key',
      fetchImpl: async () => ({ ok: true, status: 200, async json() { throw new SyntaxError('bad json'); } }),
    });
    await assert.rejects(() => service.lookupNutrition('banana'), (error) => error.code === 'INVALID_RESPONSE');
  });

  it('aborta al superar el timeout', async () => {
    const service = createNutritionService({
      apiKey: 'test-key', timeoutMs: 5,
      fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
    });
    await assert.rejects(() => service.lookupNutrition('banana'), (error) => error.code === 'TIMEOUT');
  });
});
