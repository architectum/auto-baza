import { GoogleGenAI, Type } from "@google/genai";
import { withErrorHandling, retryAsync, ServiceResult } from "../shared/lib/serviceResult";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
const aiAlt = process.env.GEMINI_API_KEY_ALT ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_ALT }) : null;

async function generateContentWithRetry(params: any) {
  return retryAsync(async () => {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      if (aiAlt) {
        console.warn('Primary API key failed, retrying with alternative API key...', error?.message);
        return await aiAlt.models.generateContent(params);
      }
      throw error;
    }
  }, { maxRetries: 3, delay: 1000, backoff: 2 });
}

function getCurrentLanguage(): 'uk' | 'en' {
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
  context: 'car' | 'history' | 'client' | 'text'
): Promise<ServiceResult<any>> {
  return withErrorHandling(async () => {
    let prompt: string;
    let schema: any;

    if (context === 'car') {
      prompt = "The speech dictation for adding a car is expected to contain ONLY the car make and model, possibly pronounced in Ukrainian/Russian. Extract only these two fields and write them in standard Latin characters as used by the manufacturer. Examples: 'тойота камрі' -> { make: 'Toyota', model: 'Camry' }, 'фольксваген пасат' -> { make: 'Volkswagen', model: 'Passat' }, 'бмв ікс п'ять' -> { make: 'BMW', model: 'X5' }. Do not extract plate, year, color, body type, client data, or notes even if mentioned. Output JSON exactly matching this schema: { make (string), model (string) }. Empty string for missing fields.";
      schema = {
        type: Type.OBJECT,
        properties: {
          make: { type: Type.STRING },
          model: { type: Type.STRING }
        }
      };
    } else if (context === 'client') {
      prompt = "Extract client/customer details from the following speech dictation. Output JSON exactly: { clientName: string, clientPhone: string }. The phone should be digits only. Empty string for missing fields.";
      schema = {
        type: Type.OBJECT,
        properties: {
          clientName: { type: Type.STRING },
          clientPhone: { type: Type.STRING }
        }
      };
    } else if (context === 'text') {
      prompt = "Transcribe the following speech audio to text. Accurately capture everything spoken, in the language it was spoken (Ukrainian, English, or Russian). Do not summarize, do not translate, and do not add any conversational filler. Just return the exact transcribed text as a JSON object: { text: string }.";
      schema = {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING }
        },
        required: ['text']
      };
    } else {
      const lang = getCurrentLanguage();
      const now = new Date();
      const timeContext = lang === 'en'
        ? `Current date and time: ${now.toLocaleString('en-US')}. Today is ${now.toLocaleDateString('en-US', { weekday: 'long' })}.`
        : `Поточна дата і час: ${now.toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })} (Київський час). Сьогодні ${now.toLocaleDateString('uk-UA', { weekday: 'long', timeZone: 'Europe/Kiev' })}.`;

      prompt = lang === 'en' ? `Analyze the dictated speech (in English, Ukrainian, or Russian) and create an entry for the vehicle service history.
Determine the entry type ('type' field) and recognize the corresponding data:

1. If the user asks for a reminder:
   - Set 'type' to 'note' with the reminder text.

2. If the user specifies car mileage (e.g., "mileage 100 thousand" or "record mileage 150000"):
   - Set 'type' to 'mileage'.
   - In 'text', write a short description (e.g., "Updated mileage: 150000 km").
   - In 'runtimeMileage', provide the numeric mileage (e.g., 150000).

3. If a problem, issue, or complaint is described (e.g., "front suspension knocking", "check engine light is on"):
   - Set 'type' to 'problem'.
   - In 'text', write the problem details.

4. If completed work, repair, or maintenance is described (e.g., "changed oil and filters", "replaced brake pads for 2000"):
   - Set 'type' to 'solution'.
   - In 'text', write the completed work details.
   - If cost is mentioned, record the numeric value in 'cost'.
   - If time spent is mentioned, record the numeric value in 'spentHours'.

5. Otherwise:
   - Set 'type' to 'note'.
   - In 'text', write the note text.

Return JSON strictly matching the schema. For missing or inapplicable fields, return null.`
        : `Проаналізуй надиктований текст українською або російською мовою та створи запис для історії обслуговування автомобіля.
Визнач тип запису (поле 'type') та розпізнай відповідні дані:

1. Якщо користувач просить про щось нагадати — запиши це як нотатку ('note') з відповідним текстом.

2. Якщо користувач вказує пробіг автомобіля (наприклад: "пробіг сто тисяч" або "запиши пробіг 150000"):
   - Встанови 'type' в 'mileage'.
   - В полі 'text' запиши короткий опис (наприклад: "Оновлено пробіг: 150000 км").
   - В полі 'runtimeMileage' вкажи числове значення пробігу (наприклад: 150000).

3. Якщо описується проблема, поломка або скарга (наприклад: "стукає підвіска справа", "горить чек"):
   - Встанови 'type' в 'problem'.
   - В полі 'text' запиши деталі проблеми.

4. Якщо описується виконана робота, ремонт або обслуговування (наприклад: "замінив масло і фільтри", "купив нові колодки за 2000 гривень"):
   - Встанови 'type' в 'solution'.
   - В полі 'text' запиши деталі виконаної роботи.
   - Якщо згадується вартість, запиши її числом в 'cost' (наприклад, "2000 гривень" -> 2000).
   - Якщо згадується витрачений час, запиши його числом в 'spentHours'.

5. В інших випадках:
   - Встанови 'type' в 'note'.
   - В полі 'text' запиши текст нотатки.

Поверни JSON строго за схемою. Якщо якесь поле відсутнє або не стосується типу запису, поверни null для нього.`;

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
      model: "gemini-3-flash-preview",
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
  mimeType: string
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
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: 'Identify the vehicle and its license plate in this image. Extract the license plate number (uppercase, no extra spaces), country, license plate color, license plate format, make, model, color, and body type.\n' +
              'For country, return one of: "UA", "PL", "D", "LT", "CZ", "RO", "MD", "GB", "US", "OTHER" (default to "UA" if in Ukraine or unclear).\n' +
              'For plateColor, return one of: "white" (standard civilian), "yellow" (public transport/taxi), "red" (transit/temporary), "green" (EV electric vehicle), "black_military" (military/special forces), "black_old" (old vintage format), "blue" (police/diplomatic).\n' +
              'For plateForm, return one of: "standard" (horizontal rectangular plate), "square_us" (square 2-line American/Japanese size), "square_moto" (square 2-line motorcycle size).\n' +
              'For color, return one of exact values in lowercase Ukrainian: "білий", "чорний", "сірий", "сріблястий", "червоний", "синій", "блакитний", "зелений", "жовтий", "коричневий", "помаранчевий", "фіолетовий", "бежевий".\n' +
              'For body type, return one of exact values in lowercase Ukrainian: "седан", "хетчбек", "універсал", "позашляховик / кросовер", "купе", "мінівен", "пікап", "кабріолет", "фургон", "мопед", "мотоцикл", "трицикл", "скутер", "велосипед", "електроскутер", "електровелосипед", "електротрицикл", "електромотоцикл".\n' +
              'If a field is not recognized, return an empty string.'
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
  files: { base64: string; mimeType: string }[]
): Promise<ServiceResult<string>> {
  return withErrorHandling(async () => {
    const parts: any[] = files.map(file => ({
      inlineData: {
        data: file.base64,
        mimeType: file.mimeType
      }
    }));

    const lang = getCurrentLanguage();
    parts.push({
      text: lang === 'en'
        ? "Analyze these vehicle diagnostic documents. Extract all the issues, errors, warnings, diagnostic codes, and recommendations. Format the result as a detailed, well-structured markdown document using headings, bullet points, and bold text for emphasis. Please respond in English."
        : "Analyze these vehicle diagnostic documents. Extract all the issues, errors, warnings, diagnostic codes, and recommendations. Format the result as a detailed, well-structured markdown document using headings, bullet points, and bold text for emphasis. Please respond in Ukrainian."
    });

    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: { parts }
    });

    return response.text || (lang === 'en' ? "Failed to analyze documents." : "Не вдалося проаналізувати документи.");
  }, 'analyzeDiagnosticFiles');
}

// 💡 getRepairSuggestions (Step 15 - 3.7.1)
export async function getRepairSuggestions(
  problem: string,
  make: string,
  model: string,
  year?: number
): Promise<ServiceResult<string[]>> {
  return withErrorHandling(async () => {
    const lang = getCurrentLanguage();
    const yearText = year ? (lang === 'en' ? ` (${year} year)` : ` (${year} року випуску)`) : '';
    const prompt = lang === 'en'
      ? `You are an experienced auto mechanic. Based on the described car problem for ${make} ${model}${yearText}:
    "${problem}"
    Suggest 3 to 5 specific potential solutions or repair steps. Consider common known issues and specifics of this vehicle make and model.
    Provide your response in English as a JSON array of concise, actionable strings (solution texts only).`
      : `Ти — досвідчений автомайстер. На основі описаної проблеми з авто ${make} ${model}${yearText}:
    "${problem}"
    Запропонуй від 3 до 5 можливих конкретних рішень або варіантів усунення цієї несправності. Враховуй типові несправності та особливості цієї марки і моделі.
    Відповідь дай українською мовою як JSON-масив коротких, чітких і зрозумілих рядків (лише тексти рішень).`;

    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
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
  historicalSolutions: { text: string; cost?: number }[]
): Promise<ServiceResult<{ suggestedCost: number; reasoning: string }>> {
  return withErrorHandling(async () => {
    const lang = getCurrentLanguage();
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
        reasoning: lang === 'en'
          ? `Calculated based on your previous records: found ${similarSolutions.length} similar service entries in your history.`
          : `Розраховано на основі ваших попередніх записів: знайдено ${similarSolutions.length} схожих робіт у вашій історії.`
      };
    }

    // Call Gemini if not enough local history
    const currentCurrency = (typeof localStorage !== 'undefined' ? localStorage.getItem('app_currency') : null) || 'UAH';
    const currName = currentCurrency === 'USD' ? 'USD ($)' : currentCurrency === 'EUR' ? 'EUR (€)' : 'Ukrainian Hryvnia (UAH, ₴)';
    const currNameUk = currentCurrency === 'USD' ? 'доларах США (USD, $)' : currentCurrency === 'EUR' ? 'євро (EUR, €)' : 'гривнях (UAH, ₴)';
    const historyContext = validSolutions.slice(0, 10).map(s => `- ${s.text}: ${s.cost} ${currentCurrency}`).join('\n');
    const prompt = lang === 'en'
      ? `You are an expert in vehicle repair cost estimation.
    Estimate the average market labor cost for the following repair on a "${make}":
    Task: "${workDescription}"
    
    ${historyContext ? `For reference, here are other jobs performed by this mechanic:\n${historyContext}\n` : ''}
    
    Provide a reasonable estimated cost in ${currName} (labor only, parts not included) and a brief explanation.
    Respond in English in JSON format:
    {
      "suggestedCost": number,
      "reasoning": "brief explanation in English"
    }`
      : `Ти — експерт з оцінки вартості ремонту автомобілів.
    Оціни середню ринкову вартість наступної роботи для автомобіля марки "${make}":
    Робота: "${workDescription}"
    
    ${historyContext ? `Для довідки, ось деякі інші роботи, виконані цим майстром:\n${historyContext}\n` : ''}
    
    Запропонуй обґрунтовану орієнтовну вартість у ${currNameUk} (лише ціна роботи без деталей) та дай коротке пояснення.
    Відповідь надішли українською мовою у форматі JSON:
    {
      "suggestedCost": число,
      "reasoning": "коротке пояснення українською мовою"
    }`;

    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
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
        reasoning: result.reasoning || (lang === 'en' ? "Estimated by AI based on market repair costs." : "Оцінено штучним інтелектом на основі ринкових цін.")
      };
    } catch {
      return {
        suggestedCost: 0,
        reasoning: lang === 'en' ? "Failed to estimate cost." : "Не вдалося оцінити вартість."
      };
    }
  }, 'suggestCost');
}

// 💡 analyzeDamagePhoto (Step 17 - 3.7.3)
export async function analyzeDamagePhoto(
  photoBase64: string,
  mimeType: string,
  make?: string,
  model?: string
): Promise<ServiceResult<{ description: string; severity: 'minor' | 'moderate' | 'severe'; estimatedParts: string[] }>> {
  return withErrorHandling(async () => {
    const lang = getCurrentLanguage();
    const carInfo = make && model ? (lang === 'en' ? ` of vehicle ${make} ${model}` : ` автомобіля ${make} ${model}`) : '';
    const prompt = lang === 'en'
      ? `Analyze this photo of vehicle damage${carInfo}.
    Describe:
    1) Type and location of damage (e.g. front bumper scratch, door dent, cracked windshield, etc.).
    2) Severity degree (choose one: 'minor', 'moderate', 'severe').
    3) Approximate list of parts or assemblies that might require repair or replacement.
    
    Provide your response in English in JSON format according to the schema.`
      : `Проаналізуй це фото пошкодження${carInfo}.
    Опиши:
    1) Тип і локалізацію пошкодження (наприклад, подряпина бампера, вм'ятина дверей тощо).
    2) Ступінь серйозності пошкодження (обери одне значення з: 'minor' (незначне), 'moderate' (середнє), 'severe' (важке/критичне)).
    3) Орієнтовний список деталей чи вузлів, які можуть потребувати заміни або ремонту.
    
    Відповідь надішли українською мовою у форматі JSON відповідно до вказаної схеми.`;

    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
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
        description: lang === 'en' ? "Failed to analyze photo." : "Не вдалося проаналізувати фото.",
        severity: 'minor',
        estimatedParts: []
      };
    }
  }, 'analyzeDamagePhoto');
}
