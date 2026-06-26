import { auth } from '@services/firebase';

export interface ErrorDetails {
  title: string;
  message: string;
  operation?: string;
  path?: string;
  stack?: string;
  timestamp: string;
  extra?: Record<string, unknown>;
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


export function createErrorDetails(
  err: unknown,
  title: string,
  operation?: string,
  path?: string,
  extra?: Record<string, unknown>
): ErrorDetails {
  const isError = err instanceof Error;
  return {
    title,
    message: isError ? err.message : String(err),
    operation,
    path,
    stack: isError ? err.stack : undefined,
    timestamp: new Date().toLocaleString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    extra,
  };
}

export function formatErrorForCopy(error: ErrorDetails): string {
  let text = `=== ПОМИЛКА ===\n`;
  text += `Заголовок: ${error.title}\n`;
  text += `Час: ${error.timestamp}\n`;
  text += `Повідомлення: ${error.message}\n`;
  if (error.operation) text += `Операція: ${error.operation}\n`;
  if (error.path) text += `Шлях: ${error.path}\n`;
  if (error.extra) text += `Дані: ${JSON.stringify(error.extra, null, 2)}\n`;
  if (error.stack) text += `\nСтек:\n${error.stack}\n`;
  text += `===============\n`;
  return text;
}

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

