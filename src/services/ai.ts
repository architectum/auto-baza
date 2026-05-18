import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
const aiAlt = process.env.GEMINI_API_KEY_ALT ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_ALT }) : null;

async function generateContentWithRetry(params: any) {
    try {
        return await ai.models.generateContent(params);
    } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || '';
        const isQuotaError = error?.status === 429 || errorMsg.includes('quota') || errorMsg.includes('429');

        if (isQuotaError && aiAlt) {
            console.warn('Quota exceeded, retrying with alternative API key...');
            return await aiAlt.models.generateContent(params);
        }

        throw error;
    }
}

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
}

// Photo Processing
export async function extractFromPhoto(base64Image: string, mimeType: string): Promise<{ plate?: string, make?: string, model?: string, color?: string, bodyType?: string }> {
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
                    text: 'Identify the car in this image. Extract the license plate number (with uppercase, dash if applicable, no extra spaces), make, model, color, and body type. For color, return one of these exact values in lowercase Ukrainian: "білий", "чорний", "сірий", "сріблястий", "червоний", "синій", "блакитний", "зелений", "жовтий", "коричневий", "помаранчевий", "фіолетовий", "бежевий". For body type, return one of these exact values in lowercase Ukrainian: "седан", "хетчбек", "універсал", "позашляховик / кросовер", "купе", "мінівен", "пікап", "кабріолет", "фургон". If a field is not clearly visible or recognized, return an empty string. Return JSON exactly matching this format: { "plate": "", "make": "", "model": "", "color": "", "bodyType": "" }.'
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
}

// Diagnostic Files Processing
export async function analyzeDiagnosticFiles(files: { base64: string, mimeType: string }[]): Promise<string> {
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
}

// Avatar Generation
export async function generateCarAvatar(params: { make: string, model: string, color?: string, bodyType?: string, year?: number }): Promise<string> {
    const promptParts = [`3D isometric render of a car, front right perspective, slightly from below.`];
    promptParts.push(`Make and model: ${params.make} ${params.model}.`);
    if (params.color) promptParts.push(`Color: ${params.color}.`);
    if (params.bodyType) promptParts.push(`Body type: ${params.bodyType}.`);
    if (params.year) promptParts.push(`Year: ${params.year}.`);
    promptParts.push(`Studio lighting, solid bright green screen background (#00FF00), highly detailed, photorealistic. The car must be fully visible and clearly separated from the background.`);
    
    const requestParams = {
        model: 'gemini-3.1-flash-image-preview',
        prompt: promptParts.join(' '),
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
        }
    };

    try {
        // @ts-ignore - generateImages exists in GoogleGenAI models but typescript might complain based on version
        const response = await ai.models.generateImages(requestParams);
        return response.generatedImages[0].image.imageBytes;
    } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || '';
        const isQuotaError = error?.status === 429 || errorMsg.includes('quota') || errorMsg.includes('429');
        if (isQuotaError && aiAlt) {
            console.warn('Quota exceeded, retrying with alternative API key...');
            // @ts-ignore
            const response = await aiAlt.models.generateImages(requestParams);
            return response.generatedImages[0].image.imageBytes;
        }
        throw error;
    }
}
