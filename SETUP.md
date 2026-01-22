# Инструкция по настройке бота

## Шаг 1: Получение токена бота ✅

Вы уже получили токен от @BotFather и указали его в `.env`.

## Шаг 2: Проверка токена

Проверьте, что токен работает:

```bash
# Установите tsx для запуска TypeScript скриптов (если еще не установлен)
npm install -D tsx

# Запустите проверку
npx tsx scripts/test-bot.ts
```

Если видите информацию о боте - токен работает! ✅

## Шаг 3: Настройка webhook для локальной разработки

Telegram не может отправлять webhook на `localhost`, поэтому нужен публичный URL.

### Вариант A: Использование ngrok (рекомендуется для разработки)

1. **Установите ngrok:**
   - Скачайте с https://ngrok.com/download
   - Или через npm: `npm install -g ngrok`

2. **Запустите ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Скопируйте HTTPS URL** (например: `https://abc123.ngrok.io`)

4. **Установите webhook:**
   ```bash
   # Замените YOUR_BOT_TOKEN и YOUR_NGROK_URL
   curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d "{\"url\": \"YOUR_NGROK_URL/api/telegram\"}"
   ```

5. **Проверьте webhook:**
   ```bash
   curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
   ```

### Вариант B: Деплой на Vercel (для продакшена)

1. **Подключите проект к Vercel:**
   - Зайдите на https://vercel.com
   - Импортируйте ваш репозиторий
   - Настройте переменные окружения в Vercel

2. **После деплоя получите URL** (например: `https://your-project.vercel.app`)

3. **Установите webhook:**
   ```bash
   curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d "{\"url\": \"https://your-project.vercel.app/api/telegram\"}"
   ```

## Шаг 4: Тестирование бота

1. **Найдите вашего бота в Telegram** (username будет показан при проверке токена)

2. **Отправьте боту сообщение:**
   - Текст для анализа, или
   - Ссылку на Telegram-пост (например: `t.me/channel/123`)

3. **Бот должен ответить** с результатами анализа

## Шаг 5: Настройка поискового API (опционально)

Для работы функции поиска источников настройте один из API:

### Google Custom Search API:
1. Перейдите на https://console.cloud.google.com
2. Создайте проект
3. Включите Custom Search API
4. Создайте API ключ
5. Создайте поисковую систему на https://cse.google.com
6. Добавьте в `.env`:
   ```
   GOOGLE_API_KEY=ваш_ключ
   GOOGLE_SEARCH_ENGINE_ID=ваш_id
   ```

### Bing Search API:
1. Перейдите на https://portal.azure.com
2. Создайте ресурс "Bing Search v7"
3. Получите ключ API
4. Добавьте в `.env`:
   ```
   BING_API_KEY=ваш_ключ
   ```

### SerpAPI:
1. Зарегистрируйтесь на https://serpapi.com
2. Получите API ключ
3. Добавьте в `.env`:
   ```
   SERPAPI_KEY=ваш_ключ
   ```

## Устранение проблем

### Бот не отвечает:
- Проверьте, что webhook установлен: `curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"`
- Проверьте логи сервера на наличие ошибок
- Убедитесь, что сервер запущен и доступен по указанному URL

### Ошибка "Unauthorized":
- Проверьте правильность токена
- Убедитесь, что токен указан в `.env` без лишних пробелов

### Webhook не работает:
- Убедитесь, что URL доступен из интернета (не localhost)
- Проверьте, что endpoint `/api/telegram` возвращает 200 OK
- Проверьте логи сервера

## Полезные команды

```bash
# Проверить информацию о webhook
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"

# Удалить webhook (вернуться к polling)
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/deleteWebhook"

# Получить информацию о боте
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getMe"
```

