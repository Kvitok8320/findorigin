# Как проверить логи на Vercel (обновленная инструкция)

## Способ 1: Через вкладку "Logs" (самый простой)

1. Зайдите на https://vercel.com
2. Откройте проект **FindOrigin**
3. Выберите последний деплой (как на вашем скриншоте)
4. **Вверху страницы найдите вкладку "Logs"** (рядом с "Deployment", "Resources", "Source")
5. Нажмите на **"Logs"**
6. Вы увидите все логи выполнения функций

## Способ 2: Через раздел Functions (если доступен)

1. На странице деплоя прокрутите вниз
2. Найдите раздел **"Functions"** или **"Serverless Functions"**
3. Там должен быть список функций, включая `/api/telegram`
4. Нажмите на `/api/telegram` для просмотра логов

## Способ 3: Через Dashboard → Logs

1. Зайдите на https://vercel.com/dashboard
2. Выберите проект **FindOrigin**
3. В меню слева найдите **"Logs"** или **"Functions"**
4. Там будут все логи проекта

## Способ 4: Через Real-time Logs

1. На странице проекта найдите кнопку **"View Function Logs"** или **"Logs"**
2. Или используйте URL: `https://vercel.com/YOUR_USERNAME/YOUR_PROJECT/logs`

## Что искать в логах:

### ✅ Хорошие признаки:
- Видны записи `[WEBHOOK] Received request`
- Видны записи `[PROCESS] Starting update processing`
- Нет ошибок

### ❌ Проблемы:
- `TELEGRAM_BOT_TOKEN is not set` - не настроена переменная окружения
- `Error processing update` - ошибка при обработке
- `Telegram API error` - проблема с отправкой сообщения
- Нет логов вообще - webhook не получает обновления

## Быстрая проверка через команду:

Пока вы ищете логи, можете проверить:

```bash
npm run check-webhook
```

Это покажет, получает ли webhook обновления.

## Альтернатива: Проверка через тестовый endpoint

Откройте в браузере:
```
https://findorigin.vercel.app/api/test-analyze
```

Это покажет, работает ли API вообще.

