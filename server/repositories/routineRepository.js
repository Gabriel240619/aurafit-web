export class InMemoryRoutineRepository {
  #routines = new Map();

  saveRoutine(sessionId, routine) {
    this.#routines.set(sessionId, structuredClone(routine));
    return routine;
  }

  getRoutine(sessionId) {
    const routine = this.#routines.get(sessionId);
    return routine ? structuredClone(routine) : null;
  }

  clear() {
    this.#routines.clear();
  }
}

export const routineRepository = new InMemoryRoutineRepository();
