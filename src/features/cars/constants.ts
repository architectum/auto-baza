import { Language } from '@shared/i18n';

export const COLORS = [
  { label: 'Білий', enLabel: 'White', value: 'білий', hex: '#FFFFFF' },
  { label: 'Чорний', enLabel: 'Black', value: 'чорний', hex: '#000000' },
  { label: 'Сірий', enLabel: 'Grey', value: 'сірий', hex: '#808080' },
  { label: 'Сріблястий', enLabel: 'Silver', value: 'сріблястий', hex: '#C0C0C0' },
  { label: 'Червоний', enLabel: 'Red', value: 'червоний', hex: '#FF0000' },
  { label: 'Синій', enLabel: 'Blue', value: 'синій', hex: '#0000FF' },
  { label: 'Блакитний', enLabel: 'Light Blue', value: 'блакитний', hex: '#ADD8E6' },
  { label: 'Зелений', enLabel: 'Green', value: 'зелений', hex: '#008000' },
  { label: 'Жовтий', enLabel: 'Yellow', value: 'жовтий', hex: '#FFFF00' },
  { label: 'Коричневий', enLabel: 'Brown', value: 'коричневий', hex: '#A52A2A' },
  { label: 'Помаранчевий', enLabel: 'Orange', value: 'помаранчевий', hex: '#FFA500' },
  { label: 'Фіолетовий', enLabel: 'Purple', value: 'фіолетовий', hex: '#800080' },
  { label: 'Бежевий', enLabel: 'Beige', value: 'бежевий', hex: '#F5F5DC' },
];

export const BODY_TYPES = [
  { label: 'Седан', enLabel: 'Sedan', value: 'седан' },
  { label: 'Хетчбек', enLabel: 'Hatchback', value: 'хетчбек' },
  { label: 'Універсал', enLabel: 'Wagon / Estate', value: 'універсал' },
  { label: 'Позашляховик / Кросовер', enLabel: 'SUV / Crossover', value: 'позашляховик / кросовер' },
  { label: 'Купе', enLabel: 'Coupe', value: 'купе' },
  { label: 'Мінівен', enLabel: 'Minivan', value: 'мінівен' },
  { label: 'Пікап', enLabel: 'Pickup', value: 'пікап' },
  { label: 'Кабріолет', enLabel: 'Cabriolet', value: 'кабріолет' },
  { label: 'Фургон', enLabel: 'Van', value: 'фургон' },
  { label: 'Мопед', enLabel: 'Moped', value: 'мопед' },
  { label: 'Мотоцикл', enLabel: 'Motorcycle', value: 'мотоцикл' },
  { label: 'Трицикл', enLabel: 'Tricycle', value: 'трицикл' },
  { label: 'Скутер', enLabel: 'Scooter', value: 'скутер' },
  { label: 'Велосипед', enLabel: 'Bicycle', value: 'велосипед' },
  { label: 'Електроскутер', enLabel: 'E-scooter', value: 'електроскутер' },
  { label: 'Електровелосипед', enLabel: 'E-bike', value: 'електровелосипед' },
  { label: 'Електротрицикл', enLabel: 'E-trike', value: 'електротрицикл' },
  { label: 'Електромотоцикл', enLabel: 'E-motorcycle', value: 'електромотоцикл' },
];

export const COUNTRY_OPTIONS = [
  { label: 'Україна', enLabel: 'Ukraine', value: 'UA', flag: '🇺🇦' },
  { label: 'Польща', enLabel: 'Poland', value: 'PL', flag: '🇵🇱' },
  { label: 'Німеччина', enLabel: 'Germany', value: 'D', flag: '🇩🇪' },
  { label: 'Литва', enLabel: 'Lithuania', value: 'LT', flag: '🇱🇹' },
  { label: 'Чехія', enLabel: 'Czechia', value: 'CZ', flag: '🇨🇿' },
  { label: 'Румунія', enLabel: 'Romania', value: 'RO', flag: '🇷🇴' },
  { label: 'Молдова', enLabel: 'Moldova', value: 'MD', flag: '🇲🇩' },
  { label: 'Великобританія', enLabel: 'United Kingdom', value: 'GB', flag: '🇬🇧' },
  { label: 'США', enLabel: 'USA', value: 'US', flag: '🇺🇸' },
  { label: 'Інша країна', enLabel: 'Other country', value: 'OTHER', flag: '🌐' },
];

export const PLATE_COLOR_OPTIONS = [
  { label: 'Білий (Звичайний)', enLabel: 'White (Standard)', value: 'white', bg: '#FFFFFF', text: '#000000', border: '#D1D5DB' },
  { label: 'Жовтий (Таксі / Автобус)', enLabel: 'Yellow (Taxi / Bus)', value: 'yellow', bg: '#FACC15', text: '#000000', border: '#EAB308' },
  { label: 'Червоний (Транзитний)', enLabel: 'Red (Transit)', value: 'red', bg: '#DC2626', text: '#FFFFFF', border: '#B91C1C' },
  { label: 'Зелений (Електромобіль EV)', enLabel: 'Green (Electric Vehicle EV)', value: 'green', bg: '#FFFFFF', text: '#16A34A', border: '#16A34A' },
  { label: 'Чорний (Військовий / Спец)', enLabel: 'Black (Military / Special)', value: 'black_military', bg: '#1F2937', text: '#FFFFFF', border: '#111827' },
  { label: 'Чорний (Старий формат)', enLabel: 'Black (Vintage format)', value: 'black_old', bg: '#1F2937', text: '#FFFFFF', border: '#111827' },
  { label: 'Синій (Поліція / Спецслужби)', enLabel: 'Blue (Police / Official)', value: 'blue', bg: '#2563EB', text: '#FFFFFF', border: '#1D4ED8' },
];

export const PLATE_FORM_OPTIONS = [
  { label: 'Широкий (Стандартний 520×112)', enLabel: 'Wide (Standard 520×112)', value: 'standard' },
  { label: 'Квадратний (США / Японія 300×150)', enLabel: 'Square (US / Japan 300×150)', value: 'square_us' },
  { label: 'Квадратний (Мото / Причіп 220×174)', enLabel: 'Square (Moto / Trailer 220×174)', value: 'square_moto' },
];

export function getLocalizedColorName(colorValue?: string, lang?: Language): string {
  if (!colorValue) return '';
  const c = COLORS.find(item => item.value === colorValue.toLowerCase());
  if (!c) return colorValue;
  return lang === 'en' ? c.enLabel : c.label;
}

export function getLocalizedBodyTypeName(bodyTypeValue?: string, lang?: Language): string {
  if (!bodyTypeValue) return '';
  const b = BODY_TYPES.find(item => item.value === bodyTypeValue.toLowerCase());
  if (!b) return bodyTypeValue;
  return lang === 'en' ? b.enLabel : b.label;
}

export function getLocalizedCountries(lang: Language) {
  return COUNTRY_OPTIONS.map(c => ({
    label: `${c.flag} ${lang === 'en' ? c.enLabel : c.label}`,
    value: c.value,
  }));
}

export function getLocalizedPlateColors(lang: Language) {
  return PLATE_COLOR_OPTIONS.map(c => ({
    label: lang === 'en' ? c.enLabel : c.label,
    value: c.value,
  }));
}

export function getLocalizedPlateForms(lang: Language) {
  return PLATE_FORM_OPTIONS.map(f => ({
    label: lang === 'en' ? f.enLabel : f.label,
    value: f.value,
  }));
}
