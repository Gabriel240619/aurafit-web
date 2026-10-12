import { findExercise, exerciseText } from '../services/exerciseService.js';
import { generateRoutine, routineSummary, validateRoutineInput } from '../services/routineService.js';
import { routineRepository } from '../repositories/routineRepository.js';

function textResponse(lines) {
  const text = Array.isArray(lines) ? lines.join('\n') : lines;
  return { fulfillmentText: text, fulfillmentMessages: [{ text: { text: [text] } }] };
}

function routineRichResponse(routine, heading) {
  const lines = routineSummary(routine);
  return {
    fulfillmentText: lines.join('\n'),
    fulfillmentMessages: [{ payload: { richContent: [[{
      type: 'description', title: heading, text: lines,
    }]] } }],
  };
}

function exerciseRichResponse(exercise) {
  return {
    fulfillmentText: exerciseText(exercise),
    fulfillmentMessages: [{ payload: { richContent: [[
      {
        type: 'image',
        rawUrl: exercise.imageUrl,
        accessibilityText: `Ejecución de ${exercise.nombre}`,
      },
      {
        type: 'description',
        title: exercise.nombre,
        text: [
          `Grupo: ${exercise.tipo}`,
          `Músculos: ${exercise.musculos.join(', ')}`,
          exercise.descripcion,
          `Técnica: ${exercise.tecnica.join(' ')}`,
          `Errores frecuentes: ${exercise.errores.join(' ')}`,
        ],
      },
    ]] } }],
  };
}

export function createDialogflowWebhook(repository = routineRepository, logger = console) {
  return async function handleDialogflowWebhook(body) {
    try {
      const action = body?.queryResult?.action;
      const parameters = body?.queryResult?.parameters ?? {};
      const sessionId = body?.session;

      if (!action) return textResponse('No he recibido una acción válida de Dialogflow.');
      if (!sessionId) return textResponse('No he podido identificar la sesión. Inténtalo de nuevo.');

      switch (action) {
        case 'rutina.crear': {
          const validation = validateRoutineInput(parameters);
          if (validation.error) return textResponse(validation.error);
          const routine = generateRoutine(validation.value);
          repository.saveRoutine(sessionId, routine);
          return routineRichResponse(routine, 'Tu nueva rutina');
        }
        case 'rutina.consultar': {
          const routine = repository.getRoutine(sessionId);
          if (!routine) {
            return textResponse('Todavía no tienes una rutina guardada. Pídeme primero que cree una para ti.');
          }
          return routineRichResponse(routine, 'Tu rutina actual');
        }
        case 'ejercicio.consultar': {
          const exercise = findExercise(parameters.ejercicio);
          if (!exercise) {
            return textResponse('No encuentro ese ejercicio en el catálogo. Prueba, por ejemplo, con sentadilla, press de banca, peso muerto, remo o plancha.');
          }
          return exerciseRichResponse(exercise);
        }
        default:
          return textResponse('No puedo gestionar esa acción todavía.');
      }
    } catch (error) {
      logger.error('Error al procesar el webhook de Dialogflow:', error);
      return { fulfillmentText: 'No he podido completar la operación. Inténtalo de nuevo.' };
    }
  };
}

export const handleDialogflowWebhook = createDialogflowWebhook();
