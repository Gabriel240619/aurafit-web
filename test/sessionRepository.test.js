import assert from 'node:assert/strict';
import { it } from 'node:test';
import { InMemorySessionRepository } from '../server/repositories/sessionRepository.js';

it('filtra el día usando Europe/Madrid y devuelve copias', () => {
  const repository = new InMemorySessionRepository();
  const session = 'session-timezone';
  repository.addMeal(session, {
    mealType: 'cena', food: 'día anterior', createdAt: '2026-10-14T21:30:00.000Z',
  });
  repository.addMeal(session, {
    mealType: 'desayuno', food: 'día actual', createdAt: '2026-10-14T22:30:00.000Z',
  });

  const state = repository.getDailyState(session, new Date('2026-10-14T22:45:00.000Z'));
  assert.deepEqual(state.meals.map((meal) => meal.food), ['día actual']);
  state.meals[0].food = 'mutado';
  assert.equal(repository.getMeals(session)[1].food, 'día actual');
});
