import { CostEstimationPromptParams } from '../types';

export function costEstimationPrompt({
  workDescription,
  make,
  currName,
  historyContext
}: CostEstimationPromptParams): string {
  return `Ти — досвідчений автоексперт та майстер-приймальник з оцінки вартості ремонту автомобілів.
Оціни середню ринкову вартість наступної роботи для автомобіля марки "${make}":
Робота: "${workDescription}"

${historyContext ? `Для довідки, ось історія вартості попередніх робіт цього майстра:\n${historyContext}\n` : ''}
Запропонуй обґрунтовану орієнтовну вартість у ${currName} (лише ціна роботи без урахування запчастин) та надай коротке технічне пояснення.

ВАЖЛИВО: Відповідь надішли українською мовою у форматі JSON:
{
  "suggestedCost": число,
  "reasoning": "коротке пояснення українською мовою"
}
Якщо опис завдання було вказано іншою мовою, пояснення все одно сформулюй українською.`;
}

export function localHistoryReasoning(count: number): string {
  return `Розраховано на основі ваших попередніх записів: знайдено ${count} схожих робіт у вашій історії.`;
}

export const defaultReasoning = "Оцінено штучним інтелектом на основі середньоринкових цін на ремонт.";
export const errorReasoning = "Не вдалося оцінити вартість.";
