# Настройка Webhook на Vercel

## Шаг 1: Получение URL вашего проекта на Vercel

1. **Зайдите на https://vercel.com** и авторизуйтесь
2. **Откройте ваш проект** (FindOrigin)
3. **После успешного деплоя** вы увидите URL проекта в формате:
   ```
   https://your-project-name.vercel.app
   ```
   или
   ```
   https://your-project-name-username.vercel.app
   ```

4. **Скопируйте этот URL** - это и есть ваш webhook URL

## Шаг 2: Полный URL для webhook

Webhook URL будет:
```
https://YOUR_PROJECT_URL.vercel.app/api/telegram
```

Например:
```
https://findorigin.vercel.app/api/telegram
```

## Шаг 3: Установка webhook через Telegram API

### Вариант A: Через командную строку (PowerShell/CMD)

```powershell
# Замените YOUR_BOT_TOKEN на ваш токен и YOUR_URL на ваш Vercel URL
$token = "YOUR_BOT_TOKEN"
$url = "https://YOUR_PROJECT_URL.vercel.app/api/telegram"

Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/setWebhook" `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{url=$url} | ConvertTo-Json)
```

### Вариант B: Через curl (если установлен)

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://YOUR_PROJECT_URL.vercel.app/api/telegram\"}"
```

### Вариант C: Через браузер

Откройте в браузере (замените YOUR_BOT_TOKEN и YOUR_URL):
```
https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://YOUR_PROJECT_URL.vercel.app/api/telegram
```

## Шаг 4: Проверка webhook

### Проверить информацию о webhook:

```powershell
# PowerShell
$token = "YOUR_BOT_TOKEN"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo"
```

Или через браузер:
```
https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo
```

### Ожидаемый результат:

```json
{
  "ok": true,
  "result": {
    "url": "https://your-project.vercel.app/api/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

## Шаг 5: Важно - переменные окружения на Vercel

**Перед установкой webhook убедитесь, что:**

1. ✅ Проект успешно задеплоен на Vercel
2. ✅ В Vercel добавлены переменные окружения:
   - Зайдите в **Settings** → **Environment Variables**
   - Добавьте `TELEGRAM_BOT_TOKEN` = ваш токен
   - Добавьте `TELEGRAM_API_URL` = `https://api.telegram.org/bot` (опционально)
3. ✅ После добавления переменных **передеплойте проект** (Redeploy)

## Шаг 6: Тестирование

1. Найдите вашего бота в Telegram: @Uchim_yazyki_bot
2. Отправьте боту любое сообщение
3. Бот должен ответить

## Устранение проблем

### Webhook не устанавливается

- Проверьте правильность токена
- Убедитесь, что URL доступен (откройте в браузере `/api/telegram` - должна быть ошибка, но не 404)
- Проверьте, что проект задеплоен

### Webhook установлен, но бот не отвечает

- Проверьте логи на Vercel: **Deployments** → выберите деплой → **Functions** → `/api/telegram`
- Убедитесь, что переменные окружения правильно настроены
- Проверьте, что endpoint доступен

### Ошибка 404 при установке webhook

- Убедитесь, что URL правильный: `https://YOUR_PROJECT.vercel.app/api/telegram`
- Проверьте, что проект задеплоен и доступен

## Быстрая команда для проверки

Создайте файл `set-webhook.ps1`:

```powershell
# set-webhook.ps1
$BOT_TOKEN = "YOUR_BOT_TOKEN"
$VERCEL_URL = "https://YOUR_PROJECT.vercel.app"

$webhookUrl = "$VERCEL_URL/api/telegram"

Write-Host "Устанавливаю webhook: $webhookUrl"

$response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{url=$webhookUrl} | ConvertTo-Json)

Write-Host "Результат:"
$response | ConvertTo-Json -Depth 10

# Проверка
Write-Host "`nПроверяю webhook:"
$info = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
$info | ConvertTo-Json -Depth 10
```

Запустите:
```powershell
.\set-webhook.ps1
```

