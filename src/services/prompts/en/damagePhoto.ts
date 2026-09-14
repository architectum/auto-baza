import { DamagePhotoPromptParams } from '../types';

export function damagePhotoPrompt({ make, model }: DamagePhotoPromptParams): string {
  const carInfo = make && model ? ` of vehicle ${make} ${model}` : '';
  return `Analyze this photo of vehicle damage${carInfo}.
Examine the visible damage and provide:
1) description: Detailed description of the type and location of damage (e.g. front bumper scuff, dented quarter panel, fractured headlight housing).
2) severity: Degree of damage severity (strictly one of: 'minor', 'moderate', 'severe').
3) estimatedParts: Array of estimated automotive parts, body panels, or assemblies that likely require repair, painting, or replacement.

IMPORTANT: Respond entirely in English in JSON format strictly according to the schema. All descriptions and parts must be written in English.`;
}

export const errorDescription = "Failed to analyze photo.";
