import { CostEstimationPromptParams } from '../types';

export function costEstimationPrompt({
  workDescription,
  make,
  currName,
  historyContext
}: CostEstimationPromptParams): string {
  return `You are an expert vehicle service advisor and repair cost estimator.
Estimate the fair market labor cost for the following repair on a "${make}":
Task: "${workDescription}"

${historyContext ? `For reference, here are other jobs previously recorded by this mechanic:\n${historyContext}\n` : ''}
Provide a reasonable estimated cost in ${currName} (labor only, parts not included) and a concise technical explanation.

IMPORTANT: Respond in English in JSON format strictly matching this schema:
{
  "suggestedCost": number,
  "reasoning": "brief explanation in English"
}
If the task description was provided in another language, write the explanation in clear English.`;
}

export function localHistoryReasoning(count: number): string {
  return `Calculated based on your previous records: found ${count} similar service entries in your history.`;
}

export const defaultReasoning = "Estimated by AI based on market repair labor rates.";
export const errorReasoning = "Failed to estimate cost.";
