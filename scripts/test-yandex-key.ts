/**
 * Скрипт для проверки YANDEX_API_KEY
 * Запуск: npm run test-yandex-key
 */

// Загружаем переменные окружения из .env ПЕРЕД импортом других модулей
import { config } from 'dotenv';
import { resolve } from 'path';

// Загружаем .env
const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID;
const YANDEX_AUTH_TYPE = process.env.YANDEX_AUTH_TYPE || 'Api-Key';

async function testYandexKey() {
  console.log('🔍 Проверка YANDEX_API_KEY...\n');

  // Шаг 1: Проверка наличия ключа
  if (!YANDEX_API_KEY) {
    console.error('❌ YANDEX_API_KEY не найден в .env');
    console.error(`   Проверьте файл: ${envPath}`);
    console.error('   Убедитесь, что файл содержит строку:');
    console.error('   YANDEX_API_KEY=ваш_ключ');
    process.exit(1);
  }

  console.log('✅ YANDEX_API_KEY найден');
  console.log(`   Длина ключа: ${YANDEX_API_KEY.length} символов`);

  // Шаг 2: Проверка формата ключа
  console.log('\n🔍 Проверка формата ключа...');
  
  const hasPrivateKeyMarker = YANDEX_API_KEY.includes('-----BEGIN');
  const hasNewlines = YANDEX_API_KEY.includes('\n');
  const startsWithT1 = YANDEX_API_KEY.startsWith('t1.');
  const startsWithAQAAA = YANDEX_API_KEY.startsWith('AQAAA');

  if (hasPrivateKeyMarker || hasNewlines) {
    console.error('❌ ОШИБКА: В YANDEX_API_KEY указан полный приватный ключ!');
    console.error('   Это неправильно. Нужно использовать:');
    console.error('   - Для IAM токена: только значение токена (начинается с t1.)');
    console.error('   - Для API ключа: только значение ключа (начинается с AQAAA)');
    console.error('\n   Что делать:');
    console.error('   1. Откройте Yandex Cloud Console');
    console.error('   2. Перейдите в сервисный аккаунт → Ключи');
    console.error('   3. Скопируйте ТОЛЬКО значение ключа (без заголовков)');
    console.error('   4. Вставьте в YANDEX_API_KEY');
    process.exit(1);
  }

  if (startsWithT1) {
    console.log('✅ Формат: IAM токен (начинается с t1.)');
    if (YANDEX_AUTH_TYPE !== 'Bearer') {
      console.warn('⚠️  Внимание: YANDEX_AUTH_TYPE установлен как', YANDEX_AUTH_TYPE);
      console.warn('   Для IAM токена должен быть YANDEX_AUTH_TYPE=Bearer');
    }
  } else if (startsWithAQAAA) {
    console.log('✅ Формат: API ключ (начинается с AQAAA)');
    if (YANDEX_AUTH_TYPE !== 'Api-Key') {
      console.warn('⚠️  Внимание: YANDEX_AUTH_TYPE установлен как', YANDEX_AUTH_TYPE);
      console.warn('   Для API ключа должен быть YANDEX_AUTH_TYPE=Api-Key');
    }
  } else {
    console.warn('⚠️  Неизвестный формат ключа');
    console.warn('   Ожидается:');
    console.warn('   - IAM токен: начинается с t1.');
    console.warn('   - API ключ: начинается с AQAAA');
  }

  // Шаг 3: Проверка YANDEX_FOLDER_ID
  console.log('\n🔍 Проверка YANDEX_FOLDER_ID...');
  
  if (!YANDEX_FOLDER_ID) {
    console.error('❌ YANDEX_FOLDER_ID не найден в .env');
    console.error('   Этот параметр обязателен для Yandex Cloud Search API v2');
    console.error('   Убедитесь, что файл содержит строку:');
    console.error('   YANDEX_FOLDER_ID=ваш_folder_id');
    process.exit(1);
  }

  console.log('✅ YANDEX_FOLDER_ID найден');
  console.log(`   Значение: ${YANDEX_FOLDER_ID}`);

  // Шаг 4: Проверка YANDEX_AUTH_TYPE
  console.log('\n🔍 Проверка YANDEX_AUTH_TYPE...');
  console.log(`   Текущее значение: ${YANDEX_AUTH_TYPE}`);
  
  if (YANDEX_AUTH_TYPE !== 'Api-Key' && YANDEX_AUTH_TYPE !== 'Bearer') {
    console.warn('⚠️  Неизвестный тип авторизации');
    console.warn('   Допустимые значения: Api-Key или Bearer');
  }

  // Шаг 5: Тестовый запрос к API
  console.log('\n🔍 Тестовый запрос к Yandex Cloud Search API v2...');
  console.log('   Это может занять несколько секунд...\n');

  const endpoint = 'https://searchapi.api.cloud.yandex.net/v2/web/search';
  const authHeader = YANDEX_AUTH_TYPE === 'Bearer'
    ? `Bearer ${YANDEX_API_KEY}`
    : `Api-Key ${YANDEX_API_KEY}`;

  const requestBody = {
    query: {
      queryText: 'тест',
      searchType: 'SEARCH_TYPE_RU',
      familyMode: 'FAMILY_MODE_MODERATE',
      page: '0',
      fixTypoMode: 'FIX_TYPO_MODE_ON',
    },
    sortSpec: {
      sortMode: 'SORT_MODE_BY_RELEVANCE',
      sortOrder: 'SORT_ORDER_DESC',
    },
    groupSpec: {
      groupMode: 'GROUP_MODE_DEEP',
      groupsOnPage: '1',
      docsInGroup: '1',
    },
    maxPassages: '1',
    region: '225',
    l10n: 'LOCALIZATION_RU',
    folderId: YANDEX_FOLDER_ID,
    responseFormat: 'FORMAT_XML',
    userAgent: 'FindOrigin-Bot/1.0',
  };

  console.log('📤 Отправка запроса...');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Auth type: ${YANDEX_AUTH_TYPE}`);
  console.log(`   Folder ID: ${YANDEX_FOLDER_ID}`);
  console.log(`   Query: "тест"`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FindOrigin-Bot/1.0',
        'Authorization': authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    console.log(`\n📥 Ответ получен за ${duration}ms`);
    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Не удалось прочитать ответ');
      console.error('\n❌ ОШИБКА API:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Ответ: ${errorText.substring(0, 500)}`);

      if (response.status === 401) {
        console.error('\n💡 Возможные причины:');
        console.error('   1. Неправильный API ключ или IAM токен');
        console.error('   2. IAM токен истек (действует 12 часов)');
        console.error('   3. Неправильный формат авторизации (Api-Key vs Bearer)');
        console.error('\n   Что проверить:');
        console.error('   - Убедитесь, что скопировали правильный ключ');
        console.error('   - Если используете IAM токен, создайте новый (старые истекают)');
        console.error('   - Проверьте YANDEX_AUTH_TYPE (Api-Key для ключа, Bearer для токена)');
      } else if (response.status === 403) {
        console.error('\n💡 Возможные причины:');
        console.error('   1. Роль "search-api.webSearch.user" не назначена на каталог');
        console.error('   2. Роль назначена неправильно (не на каталог, а на сервисный аккаунт)');
        console.error('   3. Права еще не применились (подождите 1-2 минуты)');
        console.error('\n   Что проверить:');
        console.error('   1. Откройте Yandex Cloud Console');
        console.error('   2. Перейдите в Каталог → Права доступа');
        console.error('   3. Найдите сервисный аккаунт в списке');
        console.error('   4. Убедитесь, что у него есть роль "search-api.webSearch.user" НА КАТАЛОГЕ');
      } else if (response.status === 400) {
        console.error('\n💡 Возможные причины:');
        console.error('   1. Неправильный формат запроса');
        console.error('   2. Неправильный folderId');
        console.error('\n   Что проверить:');
        console.error('   - Убедитесь, что YANDEX_FOLDER_ID правильный');
        console.error('   - Проверьте формат запроса в коде');
      }
      
      process.exit(1);
    }

    const data = await response.json();
    console.log('\n✅ УСПЕХ! API ответил корректно');
    console.log(`   Есть rawData: ${!!data.rawData}`);
    console.log(`   Длина rawData: ${data.rawData?.length || 0} символов`);

    if (data.rawData) {
      const docMatches = data.rawData.match(/<doc>/g);
      const docCount = docMatches ? docMatches.length : 0;
      console.log(`   Найдено результатов: ${docCount}`);
      
      if (docCount > 0) {
        console.log('\n✅ YANDEX_API_KEY работает корректно!');
        console.log('   Ключ валиден, API отвечает, результаты получены.');
      } else {
        console.warn('\n⚠️  API ответил, но результатов не найдено');
        console.warn('   Это может быть нормально для тестового запроса');
      }
    } else {
      console.warn('\n⚠️  API ответил, но rawData отсутствует');
      console.warn('   Проверьте формат ответа');
    }

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error('\n❌ Таймаут запроса (15 секунд)');
      console.error('   API не ответил в течение 15 секунд');
      console.error('   Возможные причины:');
      console.error('   - Проблемы с сетью');
      console.error('   - API недоступен');
      console.error('   - Неправильный endpoint');
    } else {
      console.error('\n❌ ОШИБКА при запросе:');
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack}`);
      }
    }
    
    process.exit(1);
  }
}

testYandexKey().catch((error) => {
  console.error('❌ Неожиданная ошибка:', error);
  process.exit(1);
});

