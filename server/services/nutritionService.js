import { normalizeValue } from './routineService.js';

const DEFAULT_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
// Dialogflow ES allows five seconds for Messenger webhooks. Leave time for
// processing and sending the conversational fallback when USDA is slow.
const DEFAULT_TIMEOUT_MS = 3500;

const foodAliases = new Map([
  ['platano', 'banana'], ['banana', 'banana'], ['manzana', 'apple'],
  ['arroz', 'rice'], ['aguacate', 'avocado'], ['pollo', 'chicken breast'],
  ['pechuga de pollo', 'chicken breast'], ['avena', 'oats'],
  ['yogur', 'plain yogurt'], ['yogur natural', 'plain yogurt'],
  ['salmon', 'salmon'], ['huevo', 'egg'], ['huevos', 'eggs'],
]);

const nutrientDefinitions = {
  caloriesKcal: { ids: [1008, 208], names: ['energy'] },
  proteinG: { ids: [1003, 203], names: ['protein'] },
  carbsG: { ids: [1005, 205], names: ['carbohydrate, by difference', 'carbohydrate'] },
  fatG: { ids: [1004, 204], names: ['total lipid (fat)', 'total fat'] },
  fiberG: { ids: [1079, 291], names: ['fiber, total dietary', 'dietary fiber', 'fiber'] },
};

export class NutritionServiceError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = 'NutritionServiceError';
    this.code = code;
  }
}

export function normalizeFoodSearchQuery(query) {
  const withoutQuantity = String(query ?? '')
    .trim()
    .replace(/^\d+(?:[.,]\d+)?\s*(?:g|gr|gramos?|kg|kilogramos?)\s+(?:de\s+)?/iu, '')
    .replace(/^(?:un|una|unos|unas|el|la|los|las)\s+/iu, '');
  const normalized = normalizeValue(withoutQuantity);
  return foodAliases.get(normalized) ?? withoutQuantity;
}

function nutrientId(item) {
  return Number(item.nutrientId ?? item.nutrient?.id);
}

function nutrientName(item) {
  return normalizeValue(item.nutrientName ?? item.nutrient?.name);
}

function numericValue(item) {
  if (!item) return null;
  const rawValue = item.value ?? item.amount;
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

function findNutrient(food, definition) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
  const byId = nutrients.find((item) => definition.ids.includes(nutrientId(item)));
  const byName = nutrients.find((item) => definition.names.some((name) => nutrientName(item).includes(name)));
  return numericValue(byId ?? byName);
}

export function extractNutrients(food) {
  return Object.fromEntries(Object.entries(nutrientDefinitions).map(([key, definition]) => [
    key,
    findNutrient(food, definition),
  ]));
}

export function selectBestFood(foods) {
  const priorities = { Foundation: 0, 'SR Legacy': 1, 'Survey (FNDDS)': 2, Survey: 2, Branded: 100 };
  const processedTerms = ['dehydrated', 'powder', 'baked', 'chips', 'nectar', 'pudding', 'split', 'fried', 'cooked'];
  const rank = (food) => {
    const description = normalizeValue(food.description);
    const rawBonus = /\braw\b/.test(description) ? -20 : 0;
    const processedPenalty = processedTerms.some((term) => description.includes(term)) ? 30 : 0;
    return (priorities[food.dataType] ?? 5) + rawBonus + processedPenalty;
  };
  return [...foods].sort((left, right) => rank(left) - rank(right))[0] ?? null;
}

export function createNutritionService({
  apiKey = process.env.USDA_FDC_API_KEY,
  baseUrl = process.env.USDA_FDC_BASE_URL || DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  return {
    async lookupNutrition(foodQuery) {
      const originalQuery = String(foodQuery ?? '').trim();
      if (!originalQuery) throw new NutritionServiceError('INVALID_QUERY', 'La consulta está vacía.');
      if (!apiKey || apiKey === 'REEMPLAZAR_API_KEY') {
        throw new NutritionServiceError('MISSING_API_KEY', 'Falta USDA_FDC_API_KEY.');
      }

      const searchQuery = normalizeFoodSearchQuery(originalQuery);
      const url = new URL(`${baseUrl.replace(/\/$/, '')}/foods/search`);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('query', searchQuery);
      url.searchParams.set('pageSize', '10');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(url, { signal: controller.signal });
        if (!response.ok) {
          throw new NutritionServiceError('HTTP_ERROR', `USDA respondió con HTTP ${response.status}.`);
        }

        let payload;
        try {
          payload = await response.json();
        } catch (error) {
          throw new NutritionServiceError('INVALID_RESPONSE', 'USDA devolvió JSON no válido.', { cause: error });
        }

        const foods = Array.isArray(payload?.foods) ? payload.foods : [];
        const food = selectBestFood(foods);
        if (!food) return null;

        return {
          query: originalQuery,
          matchedFood: String(food.description ?? searchQuery),
          servingDescription: 'Valores aproximados por 100 g',
          ...extractNutrients(food),
        };
      } catch (error) {
        if (error instanceof NutritionServiceError) throw error;
        if (controller.signal.aborted || error?.name === 'AbortError') {
          throw new NutritionServiceError('TIMEOUT', 'La consulta a USDA superó el tiempo límite.', { cause: error });
        }
        throw new NutritionServiceError('NETWORK_ERROR', 'No se pudo conectar con USDA.', { cause: error });
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export const nutritionService = createNutritionService();
