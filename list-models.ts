import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
    try {
        const response = await ai.models.list();
        for await (const model of response) {
            if (model.name.includes('imagen') || model.name.includes('image') || model.name.includes('vision') || model.name.includes('3')) {
                console.log(model.name);
            }
        }
    } catch (e) {
        console.error(e);
    }
}
run();
