import { RepairSuggestionsPromptParams } from '../types';

export function repairSuggestionsPrompt({
  problem,
  make,
  model,
  year
}: RepairSuggestionsPromptParams): string {
  const yearText = year ? ` (${year} model year)` : '';
  return `You are an experienced automotive technician and diagnostic specialist. Based on the described vehicle problem for ${make} ${model}${yearText}:
"${problem}"

Suggest 3 to 5 specific, actionable potential solutions or repair steps. Consider common known failure points, service bulletins, and mechanical specifics of this vehicle make and model.

IMPORTANT: Provide your response entirely in English as a JSON array of concise, clear, and actionable strings (repair solution text only). If the problem was originally described in another language, formulate your suggested solutions in fluent English.`;
}
