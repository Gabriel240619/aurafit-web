import { exercises } from '../data/exercises.js';
import { normalizeValue } from './routineService.js';

export function findExercise(value) {
  const query = normalizeValue(value);
  if (!query) return null;
  return exercises.find((exercise) =>
    [exercise.id, exercise.nombre, ...exercise.aliases].map(normalizeValue).includes(query)) ?? null;
}

export function exerciseText(exercise) {
  return [
    `${exercise.nombre} · ${exercise.tipo}`,
    exercise.descripcion,
    `Músculos: ${exercise.musculos.join(', ')}.`,
    `Técnica: ${exercise.tecnica.join(' ')}`,
    `Errores frecuentes: ${exercise.errores.join(' ')}`,
  ].join('\n');
}
