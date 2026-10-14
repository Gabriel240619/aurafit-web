import { findExercise } from '../services/exerciseService.js';
import { createActivityService, mealTypes, workoutLabel } from '../services/activityService.js';
import { nutritionService } from '../services/nutritionService.js';
import { generateRoutine, validateRoutineInput } from '../services/routineService.js';
import { sessionRepository } from '../repositories/sessionRepository.js';
import { descriptionResponse, exerciseResponse, routineResponse, textResponse } from './responses.js';

const workoutChips = ['Registrar entrenamiento', 'Ver progreso', 'Ver rutina', 'Registrar comida'];
const mealChips = ['Registrar comida', 'Resumen de alimentación', 'Consultar calorías', 'Ver progreso'];

function formatDecimal(value) {
  if (value === null || value === undefined) return 'no disponible';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value);
}

function workoutResponse(workout) {
  const duration = workout.durationMinutes ? ` durante ${formatDecimal(workout.durationMinutes)} minutos` : '';
  const confirmation = `He registrado tu entrenamiento de ${workoutLabel(workout.type)}${duration}.`;
  return descriptionResponse({
    title: 'Entrenamiento registrado', lines: [confirmation], fallbackText: confirmation, chips: workoutChips,
  });
}

function mealResponse(meal) {
  const confirmation = `He registrado “${meal.food}” en ${meal.mealType}.`;
  return descriptionResponse({
    title: 'Alimentación registrada', lines: [confirmation], fallbackText: confirmation, chips: mealChips,
  });
}

function nutritionSummaryResponse(meals) {
  if (!meals.length) {
    return descriptionResponse({
      title: 'Resumen de alimentación de hoy',
      lines: ['Todavía no has registrado alimentos hoy.'],
      chips: ['Registrar comida'],
    });
  }
  const lines = mealTypes.flatMap((mealType) => {
    const foods = meals.filter((meal) => meal.mealType === mealType).map((meal) => meal.food);
    return foods.length ? [`${mealType[0].toUpperCase()}${mealType.slice(1)}: ${foods.join(', ')}`] : [];
  });
  return descriptionResponse({
    title: 'Resumen de alimentación de hoy',
    lines,
    chips: ['Registrar comida', 'Consultar calorías', 'Ver progreso'],
  });
}

function progressResponse(state) {
  const lines = [];
  if (state.routine) {
    lines.push(`Rutina: ${state.routine.dias} día${state.routine.dias === 1 ? '' : 's'}, objetivo ${state.routine.objetivo.replaceAll('_', ' ')}.`);
  } else {
    lines.push('Rutina: todavía no tienes una rutina guardada.');
  }
  if (state.workouts.length) {
    lines.push('Entrenamientos de hoy:');
    lines.push(...state.workouts.map((workout) => {
      const duration = workout.durationMinutes ? ` · ${formatDecimal(workout.durationMinutes)} min` : '';
      return `• ${workoutLabel(workout.type)}${duration}`;
    }));
  } else {
    lines.push('Entrenamientos de hoy: ninguno registrado.');
  }
  if (state.meals.length) {
    lines.push('Alimentación de hoy:');
    lines.push(...state.meals.map((meal) => `• ${meal.mealType}: ${meal.food}`));
  } else {
    lines.push('Alimentación de hoy: ningún alimento registrado.');
  }
  if (!state.workouts.length && !state.meals.length) {
    lines.push('Aún no hay actividad ni comidas registradas hoy.');
  }
  return descriptionResponse({
    title: 'Tu progreso de hoy',
    lines,
    chips: ['Registrar entrenamiento', 'Registrar comida', 'Ver rutina', 'Resumen de alimentación'],
  });
}

function nutritionLookupResponse(result) {
  const lines = [
    `Referencia: ${result.matchedFood}`,
    result.servingDescription,
    `Energía: ${formatDecimal(result.caloriesKcal)} kcal`,
    `Proteína: ${formatDecimal(result.proteinG)} g`,
    `Carbohidratos: ${formatDecimal(result.carbsG)} g`,
    `Grasas: ${formatDecimal(result.fatG)} g`,
    `Fibra: ${formatDecimal(result.fiberG)} g`,
    'Información orientativa; los valores pueden variar según el producto y la preparación.',
  ];
  return descriptionResponse({
    title: `Información nutricional aproximada de ${result.query}`,
    lines,
    chips: ['Registrar comida', 'Consultar calorías', 'Resumen de alimentación'],
  });
}

export function createDialogflowWebhook({
  repository = sessionRepository,
  nutritionClient = nutritionService,
  logger = console,
  now = () => new Date(),
  publicBaseUrl = process.env.PUBLIC_BASE_URL,
} = {}) {
  const activityService = createActivityService(repository, now);
  return async function handleDialogflowWebhook(body, requestContext = {}) {
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
          return routineResponse(routine, 'Tu nueva rutina');
        }
        case 'rutina.consultar': {
          const routine = repository.getRoutine(sessionId);
          return routine
            ? routineResponse(routine, 'Tu rutina actual')
            : textResponse('Todavía no tienes una rutina guardada. Pídeme primero que cree una para ti.');
        }
        case 'ejercicio.consultar': {
          const exercise = findExercise(parameters.ejercicio);
          return exercise
            ? exerciseResponse(exercise, requestContext.publicBaseUrl || publicBaseUrl)
            : textResponse('No encuentro ese ejercicio en el catálogo. Prueba con sentadilla, press de banca, press militar, dominadas, remo, peso muerto, peso muerto rumano, zancadas o plancha.');
        }
        case 'entrenamiento.registrar': {
          const result = activityService.registerWorkout(sessionId, parameters);
          return result.error ? textResponse(result.error) : workoutResponse(result.value);
        }
        case 'nutricion.registrar': {
          const result = activityService.registerMeal(sessionId, parameters);
          return result.error ? textResponse(result.error) : mealResponse(result.value);
        }
        case 'nutricion.resumen':
          return nutritionSummaryResponse(activityService.getDailyState(sessionId).meals);
        case 'progreso.resumen':
          return progressResponse(activityService.getDailyState(sessionId));
        case 'nutricion.consultar_calorias': {
          const food = String(parameters.alimento ?? '').trim();
          if (!food) return textResponse('Indica el alimento cuya información nutricional quieres consultar.');
          try {
            const result = await nutritionClient.lookupNutrition(food);
            return result
              ? nutritionLookupResponse(result)
              : textResponse(`No he encontrado información nutricional para “${food}”. Prueba con otro nombre.`);
          } catch (error) {
            logger.error('Error en la consulta nutricional:', { code: error?.code, message: error?.message });
            return textResponse('No he podido obtener la información nutricional de ese alimento en este momento. Puedes intentarlo de nuevo o probar con otro nombre.');
          }
        }
        default:
          return textResponse('No puedo gestionar esa acción todavía.');
      }
    } catch (error) {
      logger.error('Error al procesar el webhook de Dialogflow:', error);
      return textResponse('No he podido completar la operación. Inténtalo de nuevo.');
    }
  };
}

export const handleDialogflowWebhook = createDialogflowWebhook();
