import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Audio/Speech Processing
export async function extractFromAudio(base64Audio: string, mimeType: string, context: 'car' | 'history' | 'client'): Promise<any> {
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
    } else {
        prompt = "Extract service history entry from the following speech dictation. Categorize it as 'problem', 'solution', 'note', or 'mileage'. If mileage is mentioned, include it. Output JSON exactly: { type: 'problem'|'solution'|'note'|'mileage', text: string, runtimeMileage: number | null }. Null for missing fields";
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
                    text: 'Identify the car in this image. Extract the license plate number (with uppercase, dash if applicable, no extra spaces), make, and model. Return JSON with format { "plate": "", "make": "", "model": "" }. Empty string if not visible.'
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

// Diagnostic Files Processing
export async function analyzeDiagnosticFiles(files: {base64: string, mimeType: string}[]): Promise<string> {
    const parts: any[] = files.map(file => ({
        inlineData: {
            data: file.base64,
            mimeType: file.mimeType
        }
    }));
    
    parts.push({
        text: "Analyze these vehicle diagnostic documents. Extract all the issues, errors, warnings, diagnostic codes, and recommendations. Format the result as a detailed, well-structured markdown document using headings, bullet points, and bold text for emphasis. Please respond in Ukrainian."
    });

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts }
    });

    return response.text || "Не вдалося проаналізувати документи.";
}
