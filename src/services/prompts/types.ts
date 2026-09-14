export interface HistoryAudioPromptParams {
  timeContext: string;
}

export interface RepairSuggestionsPromptParams {
  problem: string;
  make: string;
  model: string;
  year?: number;
}

export interface CostEstimationPromptParams {
  workDescription: string;
  make: string;
  currName: string;
  historyContext?: string;
}

export interface DamagePhotoPromptParams {
  make?: string;
  model?: string;
}

export interface AIPromptsCatalog {
  audio: {
    carAudioPrompt: string;
    clientAudioPrompt: string;
    textAudioPrompt: string;
    historyAudioPrompt: (params: HistoryAudioPromptParams) => string;
  };
  carPhoto: {
    photoAnalysisPrompt: string;
  };
  diagnostics: {
    analysisPrompt: string;
    fallbackText: string;
  };
  repairSuggestions: {
    prompt: (params: RepairSuggestionsPromptParams) => string;
  };
  costEstimation: {
    prompt: (params: CostEstimationPromptParams) => string;
    localHistoryReasoning: (count: number) => string;
    defaultReasoning: string;
    errorReasoning: string;
  };
  damagePhoto: {
    prompt: (params: DamagePhotoPromptParams) => string;
    errorDescription: string;
  };
  formatTimeContext: (now: Date) => string;
}
