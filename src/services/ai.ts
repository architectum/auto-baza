import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Audio/Speech Processing
export async function extractFromAudio(base64Audio: string, mimeType: string, context: 'car' | 'history' | 'client'): Promise<any> {
    let prompt: string;
    let schema: any;

    if (context === 'car') {
        prompt = "Extract car details from the following speech dictation. Colors MUST be one of: 'білий', 'чорний', 'сірий', 'сріблястий', 'червоний', 'синій', 'блакитний', 'зелений', 'жовтий', 'коричневий', 'помаранчевий', 'фіолетовий', 'бежевий'. Body types MUST be one of: 'седан', 'хетчбек', 'універсал', 'позашляховик / кросовер', 'купе', 'мінівен', 'пікап', 'кабріолет', 'фургон'. Output JSON exactly matching this schema: { plate (string uppercase without spaces), make (string), model (string), year (number), color (string), bodyType (string), note (string) }. Null for missing fields.";
        schema = {
            type: Type.OBJECT,
            properties: {
                plate: { type: Type.STRING },
                make: { type: Type.STRING },
                model: { type: Type.STRING },
                year: { type: Type.NUMBER },
                color: { type: Type.STRING },
                bodyType: { type: Type.STRING },
                note: { type: Type.STRING }
            }
        };
    } else if (context === 'client') {
        prompt = "Extract client/customer details from the following speech dictation. Output JSON exactly: { clientName: string, clientPhone: string }. The phone should be digits only. Null for missing fields.";
        schema = {
            type: Type.OBJECT,
            properties: {
                clientName: { type: Type.STRING },
                clientPhone: { type: Type.STRING }
            }
        };
    } else {
        prompt = "Extract service history entry from the following speech dictation. Categorize it as 'problem', 'solution', 'note', or 'mileage'. If mileage is mentioned, include it. Output JSON exactly: { type: 'problem'|'solution'|'note'|'mileage', text: string, runtimeMileage: number | null }. Null for missing fields.";
        schema = {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: ['problem', 'solution', 'note', 'mileage'] },
                text: { type: Type.STRING },
                runtimeMileage: { type: Type.NUMBER }
            }
        };
    }

    const response = await ai.models.generateContent({
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
}

// Photo Processing
export async function extractFromPhoto(base64Image: string, mimeType: string): Promise<{ plate?: string, make?: string, model?: string }> {
    const response = await ai.models.generateContent({
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
                    text: 'Identify the car in this image. Extract the license plate number (with uppercase, dash if applicable, no extra spaces), make, and model. Return JSON with format { "plate": "", "make": "", "model": "" }. Null if not visible.'
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
                    model: { type: Type.STRING }
                }
            }
        }
    });
    try {
        return JSON.parse(response.text || '{}');
    } catch {
        return {};
    }
}

// PDF Processing
export async function extractFromPdf(base64Pdf: string, mimeType: string = 'application/pdf'): Promise<string> {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
            {
                inlineData: {
                    data: base64Pdf,
                    mimeType: mimeType
                }
            },
            {
                text: "Analyze this diagnostic document. Extract all the issues, errors, warnings, diagnostic codes, and recommendations. Format the result as a detailed, well-structured markdown document using headings, bullet points, and bold text for emphasis. Please respond in Ukrainian."
            }
        ]
    });

    return response.text || "Не вдалося проаналізувати документ.";
}
