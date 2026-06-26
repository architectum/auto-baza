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
      prompt = "Transcribe the following speech audio to text. Accurately capture everything spoken, in the language it was spoken (primarily Ukrainian or Russian). Do not summarize, do not translate, and do not add any conversational filler. Just return the exact transcribed text as a JSON object: { text: string }.";
      schema = {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING }
        },
        required: ['text']
      };
    } else {
      const now = new Date();
      const timeContext = `Поточна дата і час: ${now.toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })} (Київський час). Сьогодні ${now.toLocaleDateString('uk-UA', { weekday: 'long', timeZone: 'Europe/Kiev' })}.`;

      prompt = `Проаналізуй надиктований текст українською або російською мовою та створи запис для історії обслуговування автомобіля.
Визнач тип запису (поле 'type') та розпізнай відповідні дані:

1. Якщо користувач просить про щось нагадати (наприклад: "нагадай мені завтра в одинадцять ноль ноль купити фільтр на газ", "напомни через неделю проверить масло"):
   - Встанови 'type' в 'reminder'.
   - В полі 'text' запиши очищений текст нагадування без вступних слів типу "нагадай мені" чи дати/часу (наприклад: "купити фільтр на газ" або "перевірити мастило").
   - В полі 'reminderDate' вкажи розраховану дату нагадування у форматі 'YYYY-MM-DD', враховуючи відносні часові поняття ("завтра", "післязавтра", "через тиждень", "в понеділок" тощо) відносно поточної дати: ${timeContext}.
   - В полі 'reminderTime' вкажи розрахований час нагадування у форматі 'HH:mm' (наприклад: '11:00'). Якщо час не вказано, використовуй '09:00'.
   - В полі 'reminderRecurrence' вкажи періодичність повторення, якщо вона згадується ('once', 'daily', 'weekly', 'monthly'). За замовчуванням 'once'.

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
            enum: ['problem', 'solution', 'note', 'mileage', 'reminder']
          },
          text: { type: Type.STRING },
          runtimeMileage: { type: Type.NUMBER },
          cost: { type: Type.NUMBER },
          spentHours: { type: Type.NUMBER },
          reminderDate: { type: Type.STRING },
          reminderTime: { type: Type.STRING },
          reminderRecurrence: {
            type: Type.STRING,
            enum: ['once', 'daily', 'weekly', 'monthly']
          }
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
): Promise<ServiceResult<{ plate?: string; make?: string; model?: string; color?: string; bodyType?: string }>> {
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
            text: 'Identify the vehicle in this image. Extract the license plate number (with uppercase, dash if applicable, no extra spaces), make, model, color, and body type. For color, return one of these exact values in lowercase Ukrainian: "білий", "чорний", "сірий", "сріблястий", "червоний", "синій", "блакитний", "зелений", "жовтий", "коричневий", "помаранчевий", "фіолетовий", "бежевий". For body type, return one of these exact values in lowercase Ukrainian: "седан", "хетчбек", "універсал", "позашляховик / кросовер", "купе", "мінівен", "пікап", "кабріолет", "фургон", "мопед", "мотоцикл", "трицикл", "скутер", "велосипед", "електроскутер", "електровелосипед", "електротрицикл", "електромотоцикл". If a field is not clearly visible or recognized, return an empty string. Return JSON exactly matching this format: { "plate": "", "make": "", "model": "", "color": "", "bodyType": "" }.'
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plate: { type: Type.STRING },
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

    parts.push({
      text: "Analyze these vehicle diagnostic documents. Extract all the issues, errors, warnings, diagnostic codes, and recommendations. Format the result as a detailed, well-structured markdown document using headings, bullet points, and bold text for emphasis. Please respond in Ukrainian."
    });

    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: { parts }
    });

    return response.text || "Не вдалося проаналізувати документи.";
  }, 'analyzeDiagnosticFiles');
}

// Avatar Generation
export async function generateCarAvatar(params: {
  make: string;
  model: string;
  color?: string;
  bodyType?: string;
  year?: number;
  themeId?: string;
  themeMode?: 'light' | 'dark';
}): Promise<ServiceResult<string>> {
  return withErrorHandling(async () => {
    const promptParts = [`3D isometric render of a vehicle, front right perspective, slightly from below.`];
    promptParts.push(`Make and model: ${params.make} ${params.model}.`);
    const color = params.color || 'сірий';
    promptParts.push(`Color: ${color}.`);
    if (params.bodyType) promptParts.push(`Body type: ${params.bodyType}.`);
    if (params.year) promptParts.push(`Year: ${params.year}.`);

    const THEME_BACKGROUNDS: Record<string, { dark: string; light: string }> = {
      'blue-steel': {
        dark: 'metallic dark grey-blue gradient background with a subtle steel texture',
        light: 'metallic light silver-blue gradient background with a clean brushed steel texture'
      },
      'graphite-cyan': {
        dark: 'metallic dark graphite grey gradient background with subtle cool cyan and teal undertones and a brushed metal texture',
        light: 'metallic light graphite-grey and cool cyan gradient background with a bright brushed metal texture'
      },
      'emerald-noir': {
        dark: 'metallic deep charcoal-grey gradient background with dark forest emerald green undertones and a luxurious textured finish',
        light: 'metallic light grey gradient background with soft emerald green undertones and a textured luxury finish'
      },
      'arctic-indigo': {
        dark: 'metallic cold slate-grey gradient background with deep arctic indigo and icy blue undertones and a subtle frosted texture',
        light: 'metallic bright silver-grey gradient background with cool arctic indigo and pale blue undertones and a frosted texture'
      },
      'amber-flame': {
        dark: 'metallic dark charcoal-grey gradient background with warm bronze, copper, and subtle amber undertones and a textured metal finish',
        light: 'metallic bright warm-grey gradient background with elegant bronze, copper, and soft amber undertones and a textured finish'
      },
      'rose-quartz': {
        dark: 'metallic sleek dark charcoal-grey gradient background with elegant warm rose-grey and quartz-like textured undertones',
        light: 'metallic light silver-grey gradient background with elegant soft rose-pink quartz-like textured undertones'
      },
      'violet-aurora': {
        dark: 'metallic mysterious dark purple-charcoal gradient background with deep violet-aurora undertones and a textured carbon-fiber-like finish',
        light: 'metallic light lavender-grey gradient background with soft violet-aurora undertones and a delicate textured finish'
      },
    };

    const mode = params.themeMode || 'dark';
    const backgrounds = (params.themeId && THEME_BACKGROUNDS[params.themeId]) || THEME_BACKGROUNDS['blue-steel'];
    const backgroundDesc = mode === 'dark' ? backgrounds.dark : backgrounds.light;

    promptParts.push(`Studio lighting, ${backgroundDesc}, highly detailed, photorealistic. The vehicle must be fully visible. Square 1:1 aspect ratio.`);

    const requestParams: any = {
      model: 'gemini-3.1-flash-image-preview',
      contents: promptParts.join(' '),
      config: {
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '512',
        },
        tools: [{
          googleSearch: {
            searchTypes: {
              webSearch: {},
              imageSearch: {},
            }
          }
        }],
      }
    };

    const response = await generateContentWithRetry(requestParams);
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData?.data) {
      return part.inlineData.data;
    }

    throw new Error('No image generated');
  }, 'generateCarAvatar');
}

// 💡 getRepairSuggestions (Step 15 - 3.7.1)
export async function getRepairSuggestions(
  problem: string,
  make: string,
  model: string,
  year?: number
): Promise<ServiceResult<string[]>> {
  return withErrorHandling(async () => {
    const yearText = year ? ` (${year} року випуску)` : '';
    const prompt = `Ти — досвідчений автомайстер. На основі описаної проблеми з авто ${make} ${model}${yearText}:
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
        reasoning: `Розраховано на основі ваших попередніх записів: знайдено ${similarSolutions.length} схожих робіт у вашій історії.`
      };
    }

    // Call Gemini if not enough local history
    const historyContext = validSolutions.slice(0, 10).map(s => `- ${s.text}: ${s.cost} грн`).join('\n');
    const prompt = `Ти — експерт з оцінки вартості ремонту автомобілів в Україні.
    Оціни середню ринкову вартість наступної роботи для автомобіля марки "${make}":
    Робота: "${workDescription}"
    
    ${historyContext ? `Для довідки, ось деякі інші роботи, виконані цим майстром:\n${historyContext}\n` : ''}
    
    Запропонуй обґрунтовану орієнтовну вартість у гривнях (UAH, лише ціна роботи без деталей) та дай коротке пояснення.
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
        reasoning: result.reasoning || "Оцінено штучним інтелектом на основі ринкових цін."
      };
    } catch {
      return { suggestedCost: 0, reasoning: "Не вдалося оцінити вартість." };
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
    const carInfo = make && model ? ` автомобіля ${make} ${model}` : '';
    const prompt = `Проаналізуй це фото пошкодження${carInfo}.
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
        description: "Не вдалося проаналізувати фото.",
        severity: 'minor',
        estimatedParts: []
      };
    }
  }, 'analyzeDamagePhoto');
}
