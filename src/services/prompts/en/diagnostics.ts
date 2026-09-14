export const analysisPrompt = 
  "Analyze these vehicle diagnostic documents (scanner reports, ECU error logs, inspection sheets). " +
  "Extract all detected issues, diagnostic trouble codes (DTC), errors, warnings, freeze frame data, and recommended repair or maintenance actions. " +
  "Format the result as a detailed, well-structured Markdown document using clear headings, bullet points, and bold text for emphasis. " +
  "IMPORTANT: Write the entire report and all recommendations in English.";

export const fallbackText = "Failed to analyze documents.";
