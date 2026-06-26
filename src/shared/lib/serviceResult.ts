import { logError } from '../../services/errorLogger';

export class AppError extends Error {
  public code?: string;
  public context?: string;
  public originalError?: unknown;

  constructor(message: string, opts?: { code?: string; context?: string; originalError?: unknown }) {
    super(message);
    this.name = 'AppError';
    this.code = opts?.code;
    this.context = opts?.context;
    this.originalError = opts?.originalError;

    // Restore prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export type ServiceResult<T> = 
  | { data: T; error: null }
  | { data: null; error: AppError };

interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: number;
}

/**
 * Retries an async function with exponential backoff.
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  let delay = opts.delay ?? 1000;
  const backoff = opts.backoff ?? 2;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      let isRateLimit = false;
      
      if (error instanceof Error) {
        if (
          error.message.includes('429') || 
          error.message.toLowerCase().includes('rate limit') ||
          error.message.toLowerCase().includes('quota exceeded')
        ) {
          isRateLimit = true;
        }
      }
      
      if (attempt < maxRetries) {
        const waitTime = isRateLimit 
          ? Math.max(delay * backoff, 3000)
          : delay;
          
        if (import.meta.env.DEV) {
          console.warn(`[Retry] Attempt ${attempt} failed. Retrying in ${waitTime}ms...`, error);
        }
        
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        delay *= backoff;
      }
    }
  }
  throw lastError;
}

/**
 * Higher-order function that wraps an async function with error handling and logging.
 * Returns a ServiceResult.
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string
): Promise<ServiceResult<T>> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    logError(error, context);

    let message = 'Сталася помилка при виконанні операції';
    let code = 'UNKNOWN';

    if (error instanceof Error) {
      message = error.message;
      if ('code' in error) {
        code = String((error as any).code);
      }
    }

    const appError = new AppError(message, {
      code,
      context,
      originalError: error,
    });

    return { data: null, error: appError };
  }
}
