const DEFAULT_TIME_ZONE = 'Europe/Madrid';

function emptySession() {
  return { routine: null, workouts: [], meals: [] };
}

export function dateKey(value = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export class InMemorySessionRepository {
  #sessions = new Map();

  #getOrCreate(sessionId) {
    if (!this.#sessions.has(sessionId)) this.#sessions.set(sessionId, emptySession());
    return this.#sessions.get(sessionId);
  }

  saveRoutine(sessionId, routine) {
    this.#getOrCreate(sessionId).routine = structuredClone(routine);
    return structuredClone(routine);
  }

  getRoutine(sessionId) {
    const routine = this.#sessions.get(sessionId)?.routine;
    return routine ? structuredClone(routine) : null;
  }

  addWorkout(sessionId, workout) {
    this.#getOrCreate(sessionId).workouts.push(structuredClone(workout));
    return structuredClone(workout);
  }

  getWorkouts(sessionId) {
    return structuredClone(this.#sessions.get(sessionId)?.workouts ?? []);
  }

  addMeal(sessionId, meal) {
    this.#getOrCreate(sessionId).meals.push(structuredClone(meal));
    return structuredClone(meal);
  }

  getMeals(sessionId) {
    return structuredClone(this.#sessions.get(sessionId)?.meals ?? []);
  }

  getDailyState(sessionId, date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
    const state = this.#sessions.get(sessionId) ?? emptySession();
    const requestedDay = dateKey(date, timeZone);
    const isRequestedDay = (entry) => dateKey(entry.createdAt, timeZone) === requestedDay;
    return structuredClone({
      routine: state.routine,
      workouts: state.workouts.filter(isRequestedDay),
      meals: state.meals.filter(isRequestedDay),
    });
  }

  clear() {
    this.#sessions.clear();
  }
}

export const sessionRepository = new InMemorySessionRepository();
