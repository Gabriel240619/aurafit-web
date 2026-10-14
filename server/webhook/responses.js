import { exerciseText } from '../services/exerciseService.js';
import { routineSummary } from '../services/routineService.js';

export function chipsBlock(text, options) {
  return { type: 'chips', text, options: options.map((option) => ({ text: option })) };
}

export function textResponse(text) {
  const value = Array.isArray(text) ? text.join('\n') : text;
  return { fulfillmentText: value, fulfillmentMessages: [{ text: { text: [value] } }] };
}

export function descriptionResponse({ title, lines, fallbackText, chips = [] }) {
  const safeLines = lines.filter(Boolean);
  const richContent = [{ type: 'description', title, text: safeLines }];
  if (chips.length) richContent.push(chipsBlock('¿Qué quieres hacer ahora?', chips));
  return {
    fulfillmentText: fallbackText ?? [title, ...safeLines].join('\n'),
    fulfillmentMessages: [{ payload: { richContent: [richContent] } }],
  };
}

export function routineResponse(routine, heading) {
  const lines = routineSummary(routine);
  return descriptionResponse({
    title: heading,
    lines,
    fallbackText: lines.join('\n'),
    chips: ['Ver rutina', 'Registrar entrenamiento', 'Ver progreso'],
  });
}

export function exerciseResponse(exercise) {
  const details = [
    `Grupo: ${exercise.tipo}`,
    `Músculos: ${exercise.musculos.join(', ')}`,
    exercise.descripcion,
    `Técnica: ${exercise.tecnica.join(' ')}`,
    `Errores frecuentes: ${exercise.errores.join(' ')}`,
  ];
  const blocks = [];
  if (exercise.imageUrl) {
    blocks.push({
      type: 'image',
      rawUrl: exercise.imageUrl,
      accessibilityText: `Ejecución de ${exercise.nombre}`,
    });
  }
  blocks.push({ type: 'description', title: exercise.nombre, text: details });
  blocks.push(chipsBlock('Continúa con AuraFit:', ['Ver rutina', 'Registrar entrenamiento']));
  return {
    fulfillmentText: exerciseText(exercise),
    fulfillmentMessages: [{ payload: { richContent: [blocks] } }],
  };
}
