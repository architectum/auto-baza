import { HistoryAudioPromptParams } from '../types';

export const carAudioPrompt = 
  "The speech dictation for adding a vehicle contains ONLY the vehicle make and model, " +
  "possibly pronounced in various languages or accents (English, Ukrainian, etc.). " +
  "Extract only these two fields and format them in standard Latin characters as officially used by the automotive manufacturer. " +
  "Examples: 'тойота камрі' or 'Toyota Camry' -> { make: 'Toyota', model: 'Camry' }, " +
  "'фольксваген пасат' or 'VW Passat' -> { make: 'Volkswagen', model: 'Passat' }, " +
  "'бмв ікс п'ять' or 'BMW X5' -> { make: 'BMW', model: 'X5' }. " +
  "Do not extract plate, year, color, body type, client details, or notes even if mentioned. " +
  "Output JSON exactly matching this schema: { make (string), model (string) }. Return empty string for missing fields.";

export const clientAudioPrompt = 
  "Extract customer/client details from the following speech dictation. " +
  "Output JSON strictly matching this schema: { clientName: string, clientPhone: string }.\n" +
  "IMPORTANT: Ensure the phone number contains digits only. " +
  "Format the client name in clean title case in English/Latin letters (transliterate if spoken in Cyrillic). " +
  "Return empty strings for missing fields.";

export const textAudioPrompt = 
  "Transcribe the following speech audio into text. Accurately capture everything spoken.\n" +
  "IMPORTANT: Provide the transcription in English. If the speech was spoken in English, transcribe it verbatim. " +
  "If spoken in Ukrainian, Russian, or any other language, translate it directly and naturally into English. " +
  "Do not summarize, do not omit technical details, and do not add conversational filler. " +
  "Return the result strictly as a JSON object: { text: string }.";

export function historyAudioPrompt({ timeContext }: HistoryAudioPromptParams): string {
  return `Analyze the dictated speech (spoken in English, Ukrainian, or any other language) and create an entry for the vehicle service history.
${timeContext}

Determine the entry type ('type' field) and recognize the corresponding data:

1. If the user asks for a reminder:
   - Set 'type' to 'note' with the reminder text in English.

2. If the user specifies vehicle mileage (e.g., "mileage 100 thousand" or "record mileage 150000"):
   - Set 'type' to 'mileage'.
   - In 'text', write a concise description in English (e.g., "Updated mileage: 150000 km").
   - In 'runtimeMileage', provide the numeric mileage (e.g., 150000).

3. If a problem, fault, symptom, or complaint is described (e.g., "front suspension knocking", "check engine light is on", "oil leak under vehicle"):
   - Set 'type' to 'problem'.
   - In 'text', write the problem details in English.

4. If completed work, repair, or maintenance is described (e.g., "replaced oil and filters", "replaced brake pads for 2000"):
   - Set 'type' to 'solution'.
   - In 'text', write the completed work details in English.
   - If cost is mentioned, record the numeric value in 'cost'.
   - If labor/work time spent is mentioned, record the numeric value in 'spentHours'.

5. Otherwise:
   - Set 'type' to 'note'.
   - In 'text', write the note text in English.

CRITICAL REQUIREMENT: Always provide all output text (the 'text' field) in fluent English. If the speech was dictated in Ukrainian, Russian, or any other language, accurately translate the entry description into English. Return JSON strictly matching the schema. For missing or inapplicable fields, return null.`;
}
