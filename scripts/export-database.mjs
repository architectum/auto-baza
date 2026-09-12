#!/usr/bin/env node

/**
 * Експорт повної бази даних Firestore проекту auto-baza у файл JSON.
 * Працює автономно на чистому Node.js без додаткових залежностей.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PROJECT_ID = 'auto-baza';
const DATABASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Форматування дати у формат YYYYMMDDHHmmss (наприклад, 20260912180500)
 */
function getFormattedTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${YYYY}${MM}${DD}${HH}${mm}${ss}`;
}

/**
 * Отримання OAuth2 access token через збережену сесію Firebase CLI
 */
async function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Файл конфігурації Firebase CLI не знайдено за шляхом: ${configPath}.\n` +
      `Будь ласка, виконайте в консолі: npx firebase-tools login`
    );
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    throw new Error(`Не вдалося прочитати ${configPath}: ${err.message}`);
  }

  const refreshToken = config.tokens?.refresh_token;
  if (!refreshToken) {
    throw new Error(`У ${configPath} відсутній refresh_token. Виконайте: npx firebase-tools login`);
  }

  const userEmail = config.user?.email || 'користувач Firebase';
  process.stdout.write(`🔑 Авторизація через Firebase CLI (${userEmail})...\n`);

  // Оновлюємо токен через офіційний OAuth endpoint Google
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`Помилка оновлення Google OAuth токена (${tokenRes.status}): ${errBody}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

/**
 * Конвертація Firestore typed values у звичайні значення JavaScript
 */
function decodeFirestoreValue(val) {
  if (val === null || val === undefined) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('bytesValue' in val) return val.bytesValue;
  if ('referenceValue' in val) return val.referenceValue;
  if ('geoPointValue' in val) return val.geoPointValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    return decodeFirestoreFields(val.mapValue.fields || {});
  }
  return val;
}

function decodeFirestoreFields(fields) {
  const obj = {};
  for (const [key, val] of Object.entries(fields || {})) {
    obj[key] = decodeFirestoreValue(val);
  }
  return obj;
}

/**
 * Виконання запитів з контрольованим пулом паралельності
 */
async function mapConcurrent(items, concurrency, fn) {
  const results = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Отримання списку підколекцій для заданого шляху документа
 */
async function listCollectionIds(parentPath, token) {
  const url = `https://firestore.googleapis.com/v1/${parentPath}:listCollectionIds`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pageSize: 100 }),
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.collectionIds || [];
}

/**
 * Отримання всіх документів колекції з підтримкою пагінації
 */
async function fetchCollectionDocuments(collectionUrl, token) {
  const documents = [];
  let pageToken = null;

  do {
    let url = `${collectionUrl}?pageSize=300`;
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 404) return [];
      const body = await res.text();
      throw new Error(`Помилка отримання ${collectionUrl} (${res.status}): ${body}`);
    }

    const data = await res.json();
    if (data.documents && Array.isArray(data.documents)) {
      documents.push(...data.documents);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return documents;
}

/**
 * Рекурсивне завантаження документа разом із його підколекціями
 */
async function fetchDocumentRecursive(rawDoc, token, statsCounter) {
  const docId = rawDoc.name.split('/').pop();
  const fields = decodeFirestoreFields(rawDoc.fields);

  const documentData = {
    _id: docId,
    _path: rawDoc.name.replace(`projects/${PROJECT_ID}/databases/(default)/documents/`, ''),
    _createTime: rawDoc.createTime,
    _updateTime: rawDoc.updateTime,
    ...fields,
  };

  // Перевіряємо наявність підколекцій
  const subCollectionIds = await listCollectionIds(rawDoc.name, token);

  if (subCollectionIds.length > 0) {
    documentData._subcollections = {};

    for (const subId of subCollectionIds) {
      const subUrl = `https://firestore.googleapis.com/v1/${rawDoc.name}/${subId}`;
      const rawSubDocs = await fetchCollectionDocuments(subUrl, token);

      statsCounter[subId] = (statsCounter[subId] || 0) + rawSubDocs.length;

      // Рекурсивно для кожного документа підколекції
      const subDocs = await mapConcurrent(rawSubDocs, 5, (item) =>
        fetchDocumentRecursive(item, token, statsCounter)
      );

      documentData._subcollections[subId] = subDocs;
    }
  }

  return documentData;
}

/**
 * Основний процес експорту
 */
async function main() {
  const startTime = Date.now();
  const timestamp = getFormattedTimestamp();
  
  // Дозволяємо користувачу вказати свій шлях або назву через аргумент консолі
  const customArg = process.argv[2];

  if (customArg === '--help' || customArg === '-h') {
    console.log(`
Використання:
  node scripts/export-database.mjs [назва_файлу_або_шлях]
  npm run export-db

Параметри:
  [назва_файлу_або_шлях]  (Опціонально) Шлях або назва файлу для збереження.
                          За замовчуванням зберігається у папку backups:
                          backups/auto-baza-firebase-{current_time}.json,
                          де {current_time} — у форматі YYYYMMDDHHmmss.

Приклади:
  node scripts/export-database.mjs
  node scripts/export-database.mjs backup-today.json
  npm run export-db
`);
    return;
  }

  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  let outputPath;
  if (customArg) {
    const filenameWithExt = customArg.endsWith('.json') ? customArg : `${customArg}.json`;
    if (filenameWithExt.includes(path.sep) || filenameWithExt.includes('/')) {
      outputPath = path.resolve(process.cwd(), filenameWithExt);
      const parentDir = path.dirname(outputPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
    } else {
      outputPath = path.join(backupsDir, filenameWithExt);
    }
  } else {
    outputPath = path.join(backupsDir, `auto-baza-firebase-${timestamp}.json`);
  }

  const displayPath = path.relative(process.cwd(), outputPath);

  console.log(`\n======================================================`);
  console.log(`🚗 Auto-Baza: Експорт бази даних Firestore`);
  console.log(`Проект:     ${PROJECT_ID}`);
  console.log(`Час запуску: ${new Date().toLocaleString('uk-UA')}`);
  console.log(`Файл виводу: ${displayPath}`);
  console.log(`======================================================\n`);

  const token = await getAccessToken();
  console.log(`✅ Авторизація успішна!\n`);

  // Отримуємо кореневі колекції
  console.log(`🔍 Сканування кореневих колекцій...`);
  const rootCollections = await listCollectionIds(`projects/${PROJECT_ID}/databases/(default)/documents`, token);
  
  if (rootCollections.length === 0) {
    console.log(`⚠️ Колекцій не знайдено.`);
    return;
  }

  console.log(`📦 Знайдено колекції: ${rootCollections.join(', ')}\n`);

  const databaseExport = {};
  const statsCounter = {};

  for (let i = 0; i < rootCollections.length; i++) {
    const colName = rootCollections[i];
    process.stdout.write(`[${i + 1}/${rootCollections.length}] Завантаження колекції "${colName}"... `);

    const collectionUrl = `${DATABASE_URL}/${colName}`;
    const rawDocs = await fetchCollectionDocuments(collectionUrl, token);
    statsCounter[colName] = rawDocs.length;

    console.log(`${rawDocs.length} документів.`);

    // Завантажуємо документи та підколекції паралельно (пул з 8 запитів)
    const processedDocs = await mapConcurrent(rawDocs, 8, async (rawDoc, idx) => {
      if (rawDocs.length > 30 && (idx + 1) % 25 === 0) {
        process.stdout.write(`   ⏳ Оброблено ${idx + 1} з ${rawDocs.length} документів...\r`);
      }
      return fetchDocumentRecursive(rawDoc, token, statsCounter);
    });

    if (rawDocs.length > 30) {
      process.stdout.write(`   ✅ Всі ${rawDocs.length} документів оброблено.                    \n`);
    }

    databaseExport[colName] = processedDocs;
  }

  // Формуємо фінальний JSON об'єкт
  const exportPayload = {
    metadata: {
      projectId: PROJECT_ID,
      exportedAt: new Date().toISOString(),
      timestampFormat: timestamp,
      stats: statsCounter,
    },
    database: databaseExport,
  };

  console.log(`\n💾 Збереження у файл: ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(exportPayload, null, 2), 'utf8');

  const stats = fs.statSync(outputPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n======================================================`);
  console.log(`🎉 ЕКСПОРТ УСПІШНО ЗАВЕРШЕНО!`);
  console.log(`⏱ Час виконання:   ${durationSec} сек`);
  console.log(`📁 Файл:            ${displayPath}`);
  console.log(`📊 Розмір файлу:    ${sizeMb} МБ (${stats.size.toLocaleString()} байт)`);
  console.log(`📈 Статистика записів:`);
  for (const [name, count] of Object.entries(statsCounter)) {
    console.log(`   • ${name.padEnd(16)}: ${count}`);
  }
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error('\n❌ Помилка експорту:', err);
  process.exit(1);
});
