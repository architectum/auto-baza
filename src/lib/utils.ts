import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export { createErrorDetails, type ErrorDetails, OperationType, buildFirestoreErrorDetails, buildAIErrorDetails } from "@shared/lib/errorUtils";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


/**
 * Normalizes a Ukrainian phone number to international format +380XXXXXXXXX.
 * Handles formats like: 0991234567, 380991234567, +380991234567, 80991234567, etc.
 */
export function normalizeUkrainianPhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters except leading +
  let digits = phone.replace(/[^\d]/g, '');
  
  if (!digits) return phone; // Return original if no digits
  
  // If starts with 380 (already has country code without +)
  if (digits.startsWith('380') && digits.length >= 12) {
    return '+' + digits.slice(0, 12);
  }
  
  // If starts with 80 (sometimes used without leading 3)
  if (digits.startsWith('80') && digits.length === 11) {
    return '+3' + digits;
  }
  
  // If starts with 0 (local format like 0991234567)
  if (digits.startsWith('0') && digits.length === 10) {
    return '+38' + digits;
  }
  
  // If it's just 9 digits starting with 9X (without leading 0)
  if (digits.length === 9 && digits.startsWith('9')) {
    return '+380' + digits;
  }
  
  // If already looks like a full international number
  if (digits.length >= 10) {
    // Try to prepend +
    if (phone.startsWith('+')) return phone.replace(/[^\d+]/g, '');
    return '+' + digits;
  }
  
  return phone; // Return original if can't normalize
}

/**
 * Removes bright green background (#00FF00) from a base64 image and returns a transparent base64 PNG.
 */
export async function removeGreenScreen(base64Image: string, tolerance = 80): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No 2d context'));
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Green screen target: 0, 255, 0
      const targetR = 0;
      const targetG = 255;
      const targetB = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        // Calculate distance from pure green
        const distance = Math.sqrt(
          (r - targetR) ** 2 + 
          (g - targetG) ** 2 + 
          (b - targetB) ** 2
        );

        // Also check if green is the dominant color
        if (g > r + 30 && g > b + 30 && distance < 150) {
           data[i+3] = 0; // Make transparent
        }
      }
      ctx.putImageData(imageData, 0, 0);
      
      // Get base64 (without data:image/png;base64, prefix)
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = "data:image/jpeg;base64," + base64Image;
  });
}
