import { exerciseLibrary, weeklySplits } from '../data/routineTemplates.js';

const objectiveAliases = new Map([
  ['ganar musculo', 'ganar_musculo'], ['ganancia muscular', 'ganar_musculo'],
  ['hipertrofia', 'ganar_musculo'], ['perder peso', 'perder_peso'],
  ['adelgazar', 'perder_peso'], ['mejorar resistencia', 'resistencia'],
  ['resistencia', 'resistencia'], ['mantenerse en forma', 'mantenimiento'],
  ['mantenimiento', 'mantenimiento'],
]);

const levelAdjustments = { principiante: -1, intermedio: 0, avanzado: 1 };

export function normalizeValue(value) {
  return String(value ?? '').trim().toLocaleLowerCase('es')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

export function normalizeObjective(value) {
  const normalized = normalizeValue(value);
  return objectiveAliases.get(normalized) ?? normalized.replace(/ /g, '_');
}

export function validateRoutineInput({ objetivo, nivel, dias }) {
  const normalizedObjective = normalizeObjective(objetivo);
  const normalizedLevel = normalizeValue(nivel);
  const dayCount = Number(dias);

  if (!normalizedObjective) return { error: 'Indica el objetivo de la rutina.' };
  if (!normalizedLevel) return { error: 'Indica tu nivel de entrenamiento.' };
  if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 7) {
    return { error: 'El número de días debe ser un entero entre 1 y 7.' };
  }
  if (!(normalizedLevel in levelAdjustments)) {
    return { error: 'El nivel debe ser principiante, intermedio o avanzado.' };
  }
  return { value: { objetivo: normalizedObjective, nivel: normalizedLevel, dias: dayCount } };
}

export function generateRoutine({ objetivo, nivel, dias }) {
  const plan = weeklySplits[dias].map(([nombre, templateKey], index) => ({
    dia: index + 1,
    nombre,
    ejercicios: exerciseLibrary[templateKey].map(([exerciseName, series, repeticiones]) => ({
      nombre: exerciseName,
      series: Math.max(2, series + levelAdjustments[nivel]),
      repeticiones: objetivo === 'resistencia' || objetivo === 'perder_peso' ? '12-15' : repeticiones,
    })),
  }));
  return { objetivo, nivel, dias, plan };
}

export function routineSummary(routine) {
  const days = routine.plan.map((day) => {
    const list = day.ejercicios.map((exercise) =>
      `${exercise.nombre}: ${exercise.series} × ${exercise.repeticiones}`).join(', ');
    return `Día ${day.dia} · ${day.nombre}: ${list}`;
  });
  return [
    `Tu rutina está orientada a ${routine.objetivo.replaceAll('_', ' ')}, tiene nivel ${routine.nivel} y está distribuida en ${routine.dias} día${routine.dias === 1 ? '' : 's'}.`,
    ...days,
  ];
}
