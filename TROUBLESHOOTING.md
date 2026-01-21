# Устранение проблем с ботом

## Бот не отвечает на сообщения

### Шаг 1: Проверьте переменные окружения на Vercel

1. Зайдите в ваш проект на Vercel
2. Перейдите в **Settings** → **Environment Variables**
3. Убедитесь, что добавлены:
   - `TELEGRAM_BOT_TOKEN` - ваш токен бота
   - `TELEGRAM_API_URL` (опционально, есть значение по умолчанию)

**Важно:** После добавления переменных окружения нужно **передеплоить** проект!

### Шаг 2: Проверьте webhook

Проверьте, установлен ли webhook:

```bash
# Замените YOUR_BOT_TOKEN на ваш токен
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

Должно вернуть информацию о webhook. Если webhook не установлен или URL неправильный:

```bash
# Замените YOUR_BOT_TOKEN и YOUR_VERCEL_URL
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://YOUR_VERCEL_URL.vercel.app/api/telegram\"}"
```

### Шаг 3: Проверьте доступность endpoint

Откройте в браузере:
```
https://YOUR_VERCEL_URL.vercel.app/api/telegram
```

Должна вернуться ошибка (это нормально, так как это POST endpoint), но не 404.

### Шаг 4: Проверьте логи на Vercel

1. Зайдите в ваш проект на Vercel
2. Перейдите в **Deployments**
3. Выберите последний деплой
4. Откройте **Functions** → `/api/telegram`
5. Проверьте логи на наличие ошибок

### Шаг 5: Проверьте токен локально

Запустите:
```bash
npm run test-bot
```

Если токен работает локально, но не работает на Vercel - проблема в переменных окружения.

## Частые ошибки

### Ошибка: "TELEGRAM_BOT_TOKEN is not set"
**Решение:** Добавьте переменную окружения `TELEGRAM_BOT_TOKEN` в Vercel и передеплойте проект.

### Ошибка: "Unauthorized" при установке webhook
**Решение:** Проверьте правильность токена. Убедитесь, что нет лишних пробелов.

### Webhook установлен, но бот не отвечает
**Решение:** 
1. Проверьте логи на Vercel
2. Убедитесь, что endpoint доступен
3. Проверьте, что переменные окружения правильно настроены

### Бот отвечает, но не находит источники
**Решение:** Это нормально, если не настроен поисковый API. Настройте один из API:
- Google Custom Search API
- Bing Search API  
- SerpAPI

## Быстрая проверка

1. ✅ Токен работает: `npm run test-bot`
2. ✅ Переменные окружения на Vercel настроены
3. ✅ Webhook установлен: `curl "https://api.telegram.org/botTOKEN/getWebhookInfo"`
4. ✅ Endpoint доступен: открыть в браузере `/api/telegram`
5. ✅ Логи на Vercel не показывают ошибок

Если все проверки пройдены, но бот не работает - пришлите логи из Vercel.

