export const COLORS = [
  { label: 'Білий', value: 'білий', hex: '#FFFFFF' },
  { label: 'Чорний', value: 'чорний', hex: '#000000' },
  { label: 'Сірий', value: 'сірий', hex: '#808080' },
  { label: 'Сріблястий', value: 'сріблястий', hex: '#C0C0C0' },
  { label: 'Червоний', value: 'червоний', hex: '#FF0000' },
  { label: 'Синій', value: 'синій', hex: '#0000FF' },
  { label: 'Блакитний', value: 'блакитний', hex: '#ADD8E6' },
  { label: 'Зелений', value: 'зелений', hex: '#008000' },
  { label: 'Жовтий', value: 'жовтий', hex: '#FFFF00' },
  { label: 'Коричневий', value: 'коричневий', hex: '#A52A2A' },
  { label: 'Помаранчевий', value: 'помаранчевий', hex: '#FFA500' },
  { label: 'Фіолетовий', value: 'фіолетовий', hex: '#800080' },
  { label: 'Бежевий', value: 'бежевий', hex: '#F5F5DC' },
];

export const BODY_TYPES = [
  'Седан','Хетчбек','Універсал','Позашляховик / Кросовер',
  'Купе','Мінівен','Пікап','Кабріолет','Фургон',
  'Мопед','Мотоцикл','Трицикл','Скутер','Велосипед',
  'Електроскутер','Електровелосипед','Електротрицикл','Електромотоцикл'
].map(t => ({ label: t, value: t.toLowerCase() }));

export const COUNTRY_OPTIONS = [
  { label: 'Україна', value: 'UA', flag: '🇺🇦' },
  { label: 'Польща', value: 'PL', flag: '🇵🇱' },
  { label: 'Німеччина', value: 'D', flag: '🇩🇪' },
  { label: 'Литва', value: 'LT', flag: '🇱🇹' },
  { label: 'Чехія', value: 'CZ', flag: '🇨🇿' },
  { label: 'Румунія', value: 'RO', flag: '🇷🇴' },
  { label: 'Молдова', value: 'MD', flag: '🇲🇩' },
  { label: 'Великобританія', value: 'GB', flag: '🇬🇧' },
  { label: 'США', value: 'US', flag: '🇺🇸' },
  { label: 'Інша країна', value: 'OTHER', flag: '🌐' },
];

export const PLATE_COLOR_OPTIONS = [
  { label: 'Білий (Звичайний)', value: 'white', bg: '#FFFFFF', text: '#000000', border: '#D1D5DB' },
  { label: 'Жовтий (Таксі / Автобус)', value: 'yellow', bg: '#FACC15', text: '#000000', border: '#EAB308' },
  { label: 'Червоний (Транзитний)', value: 'red', bg: '#DC2626', text: '#FFFFFF', border: '#B91C1C' },
  { label: 'Зелений (Електромобіль EV)', value: 'green', bg: '#FFFFFF', text: '#16A34A', border: '#16A34A' },
  { label: 'Чорний (Військовий / Спец)', value: 'black_military', bg: '#1F2937', text: '#FFFFFF', border: '#111827' },
  { label: 'Чорний (Старий формат)', value: 'black_old', bg: '#1F2937', text: '#FFFFFF', border: '#111827' },
  { label: 'Синій (Поліція / Спецслужби)', value: 'blue', bg: '#2563EB', text: '#FFFFFF', border: '#1D4ED8' },
];

export const PLATE_FORM_OPTIONS = [
  { label: 'Широкий (Стандартний 520×112)', value: 'standard' },
  { label: 'Квадратний (США / Японія 300×150)', value: 'square_us' },
  { label: 'Квадратний (Мото / Причіп 220×174)', value: 'square_moto' },
];

