import { GoogleGenAI, Type } from "@google/genai";
import { withErrorHandling, retryAsync, ServiceResult } from "../shared/lib/serviceResult";
import { getPrompts } from "./prompts";

export const PRIMARY_MODEL = "gemini-flash-latest";
export const FALLBACK_MODEL = "gemini-3.7-flash";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
const aiAlt = process.env.GEMINI_API_KEY_ALT ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_ALT }) : null;

async function executeWithModelFallback(client: GoogleGenAI, params: any) {
  const primaryModel = params.model || PRIMARY_MODEL;
  const fallbackModel = primaryModel === FALLBACK_MODEL ? null : FALLBACK_MODEL;

  try {
    return await client.models.generateContent({
      ...params,
      model: primaryModel,
    });
  } catch (error: any) {
    if (fallbackModel) {
      console.warn(`[AI] Model ${primaryModel} failed, falling back to ${fallbackModel}...`, error?.message);
      return await client.models.generateContent({
        ...params,
        model: fallbackModel,
      });
    }
    throw error;
  }
}

async function generateContentWithRetry(params: any) {
  return retryAsync(async () => {
    try {
      return await executeWithModelFallback(ai, params);
    } catch (error: any) {
      if (aiAlt) {
        console.warn('Primary API key failed, retrying with alternative API key...', error?.message);
        return await executeWithModelFallback(aiAlt, params);
      }
      throw error;
    }
  }, { maxRetries: 3, delay: 1000, backoff: 2 });
}

export function getCurrentLanguage(): 'uk' | 'en' {
  try {
    return (localStorage.getItem('app_language') as 'uk' | 'en') || 'uk';
  } catch {
    return 'uk';
  }
}

// Audio/Speech Processing
export async function extractFromAudio(
  base64Audio: string,
  mimeType: string,
  context: 'car' | 'history' | 'client' | 'text',
  language?: 'uk' | 'en'
): Promise<ServiceResult<any>> {
  return withErrorHandling(async () => {
    const lang = language || getCurrentLanguage();
    const prompts = getPrompts(lang);

    let prompt: string;
    let schema: any;

    if (context === 'car') {
      prompt = prompts.audio.carAudioPrompt;
      schema = {
        type: Type.OBJECT,
        properties: {
          make: { type: Type.STRING },
          model: { type: Type.STRING }
        }
      };
    } else if (context === 'client') {
      prompt = prompts.audio.clientAudioPrompt;
      schema = {
        type: Type.OBJECT,
        properties: {
          clientName: { type: Type.STRING },
          clientPhone: { type: Type.STRING }
        }
      };
    } else if (context === 'text') {
      prompt = prompts.audio.textAudioPrompt;
      schema = {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING }
        },
        required: ['text']
      };
    } else {
      const now = new Date();
      const timeContext = prompts.formatTimeContext(now);
      prompt = prompts.audio.historyAudioPrompt({ timeContext });

      schema = {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ['problem', 'solution', 'note', 'mileage']
          },
          text: { type: Type.STRING },
          runtimeMileage: { type: Type.NUMBER },
          cost: { type: Type.NUMBER },
          spentHours: { type: Type.NUMBER },
        },
        required: ['type', 'text']
      };
    }

    const response = await generateContentWithRetry({
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType
          }
        },
        {
          text: prompt
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch {
      return {};
    }
  }, `extractFromAudio (${context})`);
}

// Photo Processing
export async function extractFromPhoto(
  base64Image: string,
  mimeType: string,
  language?: 'uk' | 'en'
): Promise<ServiceResult<{
  plate?: string;
  country?: string;
  plateColor?: string;
  plateForm?: string;
  make?: string;
  model?: string;
  color?: string;
  bodyType?: string;
}>> {
  return withErrorHandling(async () => {
    const lang = language || getCurrentLanguage();
    const prompts = getPrompts(lang);

    const response = await generateContentWithRetry({
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: prompts.carPhoto.photoAnalysisPrompt
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plate: { type: Type.STRING },
            country: { type: Type.STRING },
            plateColor: { type: Type.STRING },
            plateForm: { type: Type.STRING },
            make: { type: Type.STRING },
            model: { type: Type.STRING },
            color: { type: Type.STRING },
            bodyType: { type: Type.STRING }
          }
        }
      }
    });
    try {
      return JSON.parse(response.text || '{}');
    } catch {
      return {};
    }
  }, 'extractFromPhoto');
}

// Diagnostic Files Processing
export async function analyzeDiagnosticFiles(
  files: { base64: string; mimeType: string }[],
  language?: 'uk' | 'en'
): Promise<ServiceResult<string>> {
  return withErrorHandling(async () => {
    const lang = language || getCurrentLanguage();
    const prompts = getPrompts(lang);

    const parts: any[] = files.map(file => ({
      inlineData: {
        data: file.base64,
        mimeType: file.mimeType
      }
    }));

    parts.push({
      text: prompts.diagnostics.analysisPrompt
    });

    const response = await generateContentWithRetry({
      contents: { parts }
    });

    return response.text || prompts.diagnostics.fallbackText;
  }, 'analyzeDiagnosticFiles');
}

// 💡 getRepairSuggestions (Step 15 - 3.7.1)
export async function getRepairSuggestions(
  problem: string,
  make: string,
  model: string,
  year?: number,
  language?: 'uk' | 'en'
): Promise<ServiceResult<string[]>> {
  return withErrorHandling(async () => {
    const lang = language || getCurrentLanguage();
    const prompts = getPrompts(lang);
    const prompt = prompts.repairSuggestions.prompt({ problem, make, model, year });

    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    try {
      return JSON.parse(response.text || '[]');
    } catch {
      return [];
    }
  }, 'getRepairSuggestions');
}

// 💡 suggestCost (Step 16 - 3.7.2)
export async function suggestCost(
  workDescription: string,
  make: string,
  historicalSolutions: { text: string; cost?: number }[],
  language?: 'uk' | 'en'
): Promise<ServiceResult<{ suggestedCost: number; reasoning: string }>> {
  return withErrorHandling(async () => {
    const lang = language || getCurrentLanguage();
    const prompts = getPrompts(lang);
    const validSolutions = historicalSolutions.filter(s => s.cost !== undefined && s.cost > 0);
    
    // Fuzzy match past solutions locally
    const words = workDescription.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const similarSolutions = validSolutions.filter(s => {
      const sText = s.text.toLowerCase();
      const matchCount = words.filter(w => sText.includes(w)).length;
      return matchCount >= Math.min(2, Math.ceil(words.length * 0.5));
    });

    if (similarSolutions.length >= 3) {
      const costs = similarSolutions.map(s => s.cost!).sort((a, b) => a - b);
      let suggestedCost = 0;
      const mid = Math.floor(costs.length / 2);
      if (costs.length % 2 !== 0) {
        suggestedCost = costs[mid];
      } else {
        suggestedCost = Math.round((costs[mid - 1] + costs[mid]) / 2);
      }
      
      return {
        suggestedCost,
        reasoning: prompts.costEstimation.localHistoryReasoning(similarSolutions.length)
      };
    }

    // Call Gemini if not enough local history
    const currentCurrency = (typeof localStorage !== 'undefined' ? localStorage.getItem('app_currency') : null) || 'UAH';
    const currName = lang === 'en'
      ? (currentCurrency === 'USD' ? 'USD ($)' : currentCurrency === 'EUR' ? 'EUR (€)' : 'Ukrainian Hryvnia (UAH, ₴)')
      : (currentCurrency === 'USD' ? 'доларах США (USD, $)' : currentCurrency === 'EUR' ? 'євро (EUR, €)' : 'гривнях (UAH, ₴)');

    const historyContext = validSolutions.slice(0, 10).map(s => `- ${s.text}: ${s.cost} ${currentCurrency}`).join('\n');
    const prompt = prompts.costEstimation.prompt({
      workDescription,
      make,
      currName,
      historyContext: historyContext || undefined
    });

    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedCost: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ['suggestedCost', 'reasoning']
        }
      }
    });

    try {
      const result = JSON.parse(response.text || '{}');
      return {
        suggestedCost: Math.round(result.suggestedCost || 0),
        reasoning: result.reasoning || prompts.costEstimation.defaultReasoning
      };
    } catch {
      return {
        suggestedCost: 0,
        reasoning: prompts.costEstimation.errorReasoning
      };
    }
  }, 'suggestCost');
}

// 💡 analyzeDamagePhoto (Step 17 - 3.7.3)
export async function analyzeDamagePhoto(
  photoBase64: string,
  mimeType: string,
  make?: string,
  model?: string,
  language?: 'uk' | 'en'
): Promise<ServiceResult<{ description: string; severity: 'minor' | 'moderate' | 'severe'; estimatedParts: string[] }>> {
  return withErrorHandling(async () => {
    const lang = language || getCurrentLanguage();
    const prompts = getPrompts(lang);
    const prompt = prompts.damagePhoto.prompt({ make, model });

    const response = await generateContentWithRetry({
      contents: [
        {
          inlineData: {
            data: photoBase64,
            mimeType: mimeType
          }
        },
        {
          text: prompt
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ['minor', 'moderate', 'severe'] },
            estimatedParts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['description', 'severity', 'estimatedParts']
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch {
      return {
        description: prompts.damagePhoto.errorDescription,
        severity: 'minor',
        estimatedParts: []
      };
    }
  }, 'analyzeDamagePhoto');
}
