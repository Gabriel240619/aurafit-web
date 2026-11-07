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

function resolveImageUrl(imagePath, publicBaseUrl) {
  if (!imagePath) return null;
  if (/^https:\/\//i.test(imagePath)) return imagePath;
  if (!publicBaseUrl) return imagePath;
  return new URL(imagePath, `${publicBaseUrl.replace(/\/$/, '')}/`).href;
}

export function exerciseResponse(exercise, publicBaseUrl) {
  const details = [
    `Grupo: ${exercise.tipo}`,
    `Músculos: ${exercise.musculos.join(', ')}`,
    exercise.descripcion,
    `Técnica: ${exercise.tecnica.join(' ')}`,
    `Errores frecuentes: ${exercise.errores.join(' ')}`,
  ];
  const richContent = [];
  const imageUrl = resolveImageUrl(exercise.imagePath, publicBaseUrl);
  if (imageUrl) {
    // Messenger hides the entire card when an image fails to load. Keep the
    // image in its own card so the exercise instructions always remain visible.
    richContent.push([{
      type: 'image',
      rawUrl: imageUrl,
      accessibilityText: `Ejecución de ${exercise.nombre}`,
    }]);
  }
  richContent.push([
    { type: 'description', title: exercise.nombre, text: details },
    chipsBlock('Continúa con AuraFit:', ['Ver rutina', 'Registrar entrenamiento']),
  ]);
  return {
    fulfillmentText: exerciseText(exercise),
    fulfillmentMessages: [{ payload: { richContent } }],
  };
}
