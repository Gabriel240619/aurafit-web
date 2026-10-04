export const dialogflowConfig = {
  agentId: import.meta.env.VITE_DIALOGFLOW_AGENT_ID || 'REEMPLAZAR_AGENT_ID',
  languageCode: 'es',
  intent: 'WELCOME',
  chatTitle: 'AuraFit Coach',
};

export const isDialogflowConfigured =
  dialogflowConfig.agentId !== 'REEMPLAZAR_AGENT_ID' &&
  dialogflowConfig.agentId.trim().length > 0;
