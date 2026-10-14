import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'dialogflow-agent');
const dynamicIntents = [
  'rutina.crear',
  'rutina.consultar',
  'ejercicio.consultar',
  'entrenamiento.registrar',
  'nutricion.registrar',
  'nutricion.resumen',
  'nutricion.consultar_calorias',
  'progreso.resumen',
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function writeJson(relativePath, value) {
  await writeFile(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const fallbackMessage = {
  type: 0,
  title: '',
  textToSpeech: '',
  lang: 'es',
  speech: ['No he podido completar esta operación en este momento. Inténtalo de nuevo.'],
  condition: '',
};

for (const intentName of dynamicIntents) {
  const relativePath = `intents/${intentName}.json`;
  const intent = await readJson(relativePath);
  intent.webhookUsed = true;
  intent.webhookForSlotFilling = false;
  intent.responses[0].action = intentName;
  intent.responses[0].messages = [fallbackMessage];
  await writeJson(relativePath, intent);
}

const exerciseEntries = [
  { value: 'sentadilla', synonyms: ['sentadilla', 'sentadillas', 'squat'] },
  { value: 'press_banca', synonyms: ['press_banca', 'press banca', 'press de banca', 'bench press'] },
  { value: 'press_militar', synonyms: ['press_militar', 'press militar', 'press de hombros', 'overhead press'] },
  { value: 'dominadas', synonyms: ['dominadas', 'dominada', 'pull up', 'pull ups'] },
  { value: 'remo', synonyms: ['remo', 'remo con barra', 'barbell row'] },
  { value: 'peso_muerto', synonyms: ['peso_muerto', 'peso muerto', 'deadlift'] },
  { value: 'peso_muerto_rumano', synonyms: ['peso_muerto_rumano', 'peso muerto rumano', 'romanian deadlift', 'RDL'] },
  { value: 'zancadas', synonyms: ['zancadas', 'zancada', 'lunges', 'lunge'] },
  { value: 'plancha', synonyms: ['plancha', 'plancha abdominal', 'plank'] },
];
await writeJson('entities/ejercicio_entries_es.json', exerciseEntries);

function phrase(prefix, exercise, suffix = '') {
  const hash = createHash('sha256').update(`${prefix}|${exercise}|${suffix}`).digest('hex');
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  return {
    id,
    data: [
      ...(prefix ? [{ text: prefix, userDefined: false }] : []),
      { text: exercise, meta: '@ejercicio', alias: 'ejercicio', userDefined: true },
      ...(suffix ? [{ text: suffix, userDefined: false }] : []),
    ],
    isTemplate: false,
    count: 0,
    lang: 'es',
    updated: 0,
  };
}

const exercisePhrases = [
  phrase('¿Cómo se hace ', 'sentadilla', '?'),
  phrase('Explícame el ', 'press banca'),
  phrase('¿Qué técnica tiene el ', 'peso muerto rumano', '?'),
  phrase('Quiero aprender a hacer ', 'dominadas'),
  phrase('Muéstrame la técnica de ', 'remo'),
  phrase('Errores comunes en ', 'press militar'),
  phrase('¿Qué músculos trabajan las ', 'zancadas', '?'),
  phrase('Ayúdame con la técnica de ', 'peso muerto'),
  phrase('¿Cómo ejecuto la ', 'plancha', '?'),
  phrase('La ', 'sentadilla', ', ¿qué músculos trabaja?'),
  phrase('Para el ', 'press banca', ', ¿qué errores debo evitar?'),
  phrase('Enséñame a hacer ', 'dominadas', ' correctamente'),
  phrase('Quiero consultar el ejercicio ', 'press militar'),
];
await writeJson('intents/ejercicio.consultar_usersays_es.json', exercisePhrases);

const agent = await readJson('agent.json');
agent.timeZone = 'Europe/Madrid';
agent.webhook = {
  ...agent.webhook,
  url: '',
  username: '',
  headers: {},
  available: false,
  useForDomains: false,
  cloudFunctionsEnabled: false,
  cloudFunctionsInitialized: false,
};
await writeJson('agent.json', agent);

console.log(`Export de Dialogflow actualizado en ${root}`);
