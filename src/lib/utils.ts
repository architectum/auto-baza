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
