import { AIPromptsCatalog } from '../types';
import * as audio from './audio';
import * as carPhoto from './carPhoto';
import * as diagnostics from './diagnostics';
import * as repairSuggestions from './repairSuggestions';
import * as costEstimation from './costEstimation';
import * as damagePhoto from './damagePhoto';

export const ukPrompts: AIPromptsCatalog = {
  audio: {
    carAudioPrompt: audio.carAudioPrompt,
    clientAudioPrompt: audio.clientAudioPrompt,
    textAudioPrompt: audio.textAudioPrompt,
    historyAudioPrompt: audio.historyAudioPrompt,
  },
  carPhoto: {
    photoAnalysisPrompt: carPhoto.photoAnalysisPrompt,
  },
  diagnostics: {
    analysisPrompt: diagnostics.analysisPrompt,
    fallbackText: diagnostics.fallbackText,
  },
  repairSuggestions: {
    prompt: repairSuggestions.repairSuggestionsPrompt,
  },
  costEstimation: {
    prompt: costEstimation.costEstimationPrompt,
    localHistoryReasoning: costEstimation.localHistoryReasoning,
    defaultReasoning: costEstimation.defaultReasoning,
    errorReasoning: costEstimation.errorReasoning,
  },
  damagePhoto: {
    prompt: damagePhoto.damagePhotoPrompt,
    errorDescription: damagePhoto.errorDescription,
  },
  formatTimeContext: (now: Date) =>
    `Поточна дата і час: ${now.toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })} (Київський час). Сьогодні ${now.toLocaleDateString('uk-UA', { weekday: 'long', timeZone: 'Europe/Kiev' })}.`,
};
