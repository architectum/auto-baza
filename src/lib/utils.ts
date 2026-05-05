import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { auth } from "../services/firebase";
import { createErrorDetails, type ErrorDetails } from "../components/ErrorModal";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const OPERATION_LABELS: Record<string, string> = {
  create: 'Створення',
  update: 'Оновлення',
  delete: 'Видалення',
  list: 'Список',
  get: 'Отримання',
  write: 'Запис',
};

/**
 * Creates error details for Firestore errors. 
 * Call showError() from ErrorModal context to display.
 */
export function buildFirestoreErrorDetails(
  error: unknown,
  operationType: OperationType,
  path: string | null
): ErrorDetails {
  const authInfo = {
    userId: auth.currentUser?.uid || 'N/A',
    email: auth.currentUser?.email || 'N/A',
    emailVerified: auth.currentUser?.emailVerified,
    isAnonymous: auth.currentUser?.isAnonymous,
    providers: auth.currentUser?.providerData?.map(p => p.providerId).join(', ') || 'N/A',
  };

  console.error('Firestore Error:', {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo,
  });

  return createErrorDetails(
    error,
    `Помилка Firestore: ${OPERATION_LABELS[operationType] || operationType}`,
    OPERATION_LABELS[operationType] || operationType,
    path || undefined,
    authInfo
  );
}

/**
 * Creates error details for AI/Gemini service errors.
 */
export function buildAIErrorDetails(
  error: unknown,
  operation: string
): ErrorDetails {
  console.error('AI Service Error:', {
    error: error instanceof Error ? error.message : String(error),
    operation,
  });

  return createErrorDetails(
    error,
    `Помилка AI: ${operation}`,
    operation
  );
}
