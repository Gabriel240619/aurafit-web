export const exerciseLibrary = {
  empuje: [
    ['Press de banca', 4, '8-10'], ['Press militar', 3, '8-12'],
    ['Fondos asistidos', 3, '10-12'], ['Elevaciones laterales', 3, '12-15'],
  ],
  tiron: [
    ['Remo con barra', 4, '8-10'], ['Jalón al pecho', 3, '8-12'],
    ['Remo en polea', 3, '10-12'], ['Curl de bíceps', 3, '10-15'],
  ],
  pierna: [
    ['Sentadilla', 4, '8-10'], ['Peso muerto rumano', 3, '8-12'],
    ['Zancadas', 3, '10 por pierna'], ['Elevación de gemelos', 3, '12-15'],
  ],
  full_body_a: [
    ['Sentadilla', 3, '8-12'], ['Press de banca', 3, '8-12'],
    ['Remo con barra', 3, '8-12'], ['Plancha', 3, '30-45 s'],
  ],
  full_body_b: [
    ['Peso muerto', 3, '6-10'], ['Press militar', 3, '8-12'],
    ['Jalón al pecho', 3, '8-12'], ['Zancadas', 3, '10 por pierna'],
  ],
};

export const weeklySplits = {
  1: [['Cuerpo completo', 'full_body_a']],
  2: [['Cuerpo completo A', 'full_body_a'], ['Cuerpo completo B', 'full_body_b']],
  3: [['Empuje', 'empuje'], ['Tirón', 'tiron'], ['Pierna', 'pierna']],
  4: [['Tren superior A', 'empuje'], ['Tren inferior A', 'pierna'], ['Tren superior B', 'tiron'], ['Tren inferior B', 'pierna']],
  5: [['Empuje', 'empuje'], ['Tirón', 'tiron'], ['Pierna', 'pierna'], ['Tren superior', 'full_body_a'], ['Cuerpo completo', 'full_body_b']],
  6: [['Empuje A', 'empuje'], ['Tirón A', 'tiron'], ['Pierna A', 'pierna'], ['Empuje B', 'empuje'], ['Tirón B', 'tiron'], ['Pierna B', 'pierna']],
  7: [['Empuje A', 'empuje'], ['Tirón A', 'tiron'], ['Pierna A', 'pierna'], ['Cuerpo completo A', 'full_body_a'], ['Empuje B', 'empuje'], ['Tirón B', 'tiron'], ['Pierna B', 'pierna']],
};
