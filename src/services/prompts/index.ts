import { AIPromptsCatalog } from './types';
import { enPrompts } from './en';
import { ukPrompts } from './uk';

export * from './types';
export { enPrompts } from './en';
export { ukPrompts } from './uk';

export function getPrompts(lang?: 'uk' | 'en'): AIPromptsCatalog {
  if (lang === 'en') return enPrompts;
  if (lang === 'uk') return ukPrompts;

  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('app_language') : null;
    return saved === 'en' ? enPrompts : ukPrompts;
  } catch {
    return ukPrompts;
  }
}
