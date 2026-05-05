import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Audio/Speech Processing
export async function extractFromVoice(transcript: string, context: 'car' | 'history'): Promise<any> {
    const prompt = context === 'car' 
        ? "Extract car and client details from the following speech dictation. Output JSON exactly matching this schema: { plate (string uppercase without spaces), make (string), model (string), year (number), mileage (number), color (string), bodyType (string), clientName (string), clientPhone (string), note (string) }. Null for missing fields."
        : "Extract service history entry from the following speech dictation. Categorize it as 'problem', 'solution', 'note', or 'mileage'. If mileage is mentioned, include it. Output JSON exactly: { type: 'problem'|'solution'|'note'|'mileage', text: string, runtimeMileage: number | null }. Null for missing fields.";

    const schema = context === 'car' 
        ? {
            type: Type.OBJECT,
            properties: {
                plate: { type: Type.STRING },
                make: { type: Type.STRING },
                model: { type: Type.STRING },
                year: { type: Type.NUMBER },
                mileage: { type: Type.NUMBER },
                color: { type: Type.STRING },
                bodyType: { type: Type.STRING },
                clientName: { type: Type.STRING },
                clientPhone: { type: Type.STRING },
                note: { type: Type.STRING }
            }
        }
        : {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: ['problem', 'solution', 'note', 'mileage'] },
                text: { type: Type.STRING },
                runtimeMileage: { type: Type.NUMBER }
            }
        };

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: transcript + "\n\n" + prompt,
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
