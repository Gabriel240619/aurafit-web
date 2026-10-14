import { normalizeValue } from './routineService.js';

const workoutAliases = new Map([
  ['tren superior', 'tren_superior'], ['torso', 'tren_superior'], ['upper body', 'tren_superior'],
  ['tren inferior', 'tren_inferior'], ['piernas', 'tren_inferior'], ['lower body', 'tren_inferior'],
  ['cuerpo completo', 'cuerpo_completo'], ['cuerpo entero', 'cuerpo_completo'], ['full body', 'cuerpo_completo'],
  ['cardio', 'cardio'], ['cardiovascular', 'cardio'], ['aerobico', 'cardio'],
]);

const workoutLabels = {
  tren_superior: 'tren superior',
  tren_inferior: 'tren inferior',
  cuerpo_completo: 'cuerpo completo',
  cardio: 'cardio',
};

export const mealTypes = ['desayuno', 'almuerzo', 'comida', 'merienda', 'cena'];

export function normalizeWorkoutType(value) {
  return workoutAliases.get(normalizeValue(value)) ?? null;
}

export function workoutLabel(value) {
  return workoutLabels[value] ?? value.replaceAll('_', ' ');
}

export function validateWorkoutInput({ tipo_entrenamiento, duracion }) {
  const type = normalizeWorkoutType(tipo_entrenamiento);
  if (!type) {
    return { error: 'Indica un tipo válido: tren superior, tren inferior, cuerpo completo o cardio.' };
  }

  const durationIsMissing = duracion === undefined || duracion === null || duracion === '';
  const durationMinutes = durationIsMissing ? null : Number(duracion);
  if (!durationIsMissing && (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440)) {
    return { error: 'La duración debe ser un número positivo y razonable de minutos.' };
  }

  return { value: { type, durationMinutes } };
}

export function validateMealInput({ tipo_comida, alimento }) {
  const mealType = normalizeValue(tipo_comida);
  const food = String(alimento ?? '').trim();
  if (!mealTypes.includes(mealType)) {
    return { error: 'Indica si corresponde a desayuno, almuerzo, comida, merienda o cena.' };
  }
  if (!food) return { error: 'Indica qué alimento o comida quieres registrar.' };
  return { value: { mealType, food } };
}

export function createActivityService(repository, now = () => new Date()) {
  return {
    registerWorkout(sessionId, parameters) {
      const validation = validateWorkoutInput(parameters);
      if (validation.error) return validation;
      const workout = { ...validation.value, createdAt: now().toISOString() };
      repository.addWorkout(sessionId, workout);
      return { value: workout };
    },

    registerMeal(sessionId, parameters) {
      const validation = validateMealInput(parameters);
      if (validation.error) return validation;
      const meal = { ...validation.value, createdAt: now().toISOString() };
      repository.addMeal(sessionId, meal);
      return { value: meal };
    },

    getDailyState(sessionId) {
      return repository.getDailyState(sessionId, now());
    },
  };
}
