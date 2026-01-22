# Финальное решение ошибки 403: "This project does not have the access to Custom Search JSON API"

## Проблема:

Ошибка в логах:
```
"error": {
  "code": 403,
  "message": "This project does not have the access to Custom Search JSON API.",
  "status": "PERMISSION_DENIED"
}
```

## Решение:

### Шаг 1: Проверьте точное название API

В Google Cloud Console нужно включить именно:
- ✅ **"Custom Search API"** (правильно)
- ❌ НЕ "Custom Search" (без API)
- ❌ НЕ "Google Custom Search" (старое название)

### Шаг 2: Убедитесь, что API включен в правильном проекте

1. В Google Cloud Console проверьте, что выбран проект **"educationcursor"**
2. Перейдите: **"APIs & Services"** → **"Enabled APIs"**
3. Найдите в списке **"Custom Search API"**
4. Если его нет - включите через **"Library"**

### Шаг 3: Проверьте, что API ключ создан в том же проекте

1. **"APIs & Services"** → **"Credentials"**
2. Найдите "API key 1"
3. Убедитесь, что он создан в проекте "educationcursor"
4. Если нет - создайте новый ключ в правильном проекте

### Шаг 4: Пересоздайте API ключ (если проблема сохраняется)

Иногда помогает пересоздание ключа:

1. Удалите старый ключ
2. Создайте новый ключ в проекте "educationcursor"
3. Ограничьте его Custom Search API
4. Обновите `GOOGLE_API_KEY` на Vercel
5. Передеплойте проект

### Шаг 5: Подождите 10-15 минут

После включения API или создания ключа может потребоваться время для активации.

## Альтернативное решение:

Если проблема не решается, используйте **Bing Search API**:

1. Зайдите на https://portal.azure.com
2. Создайте ресурс "Bing Search v7"
3. Получите ключ API
4. Добавьте `BING_API_KEY` в Vercel
5. Передеплойте проект

Bing Search API обычно работает более стабильно на Vercel.

## Быстрая проверка:

1. ✅ Проект "educationcursor" выбран
2. ✅ Custom Search API включен в этом проекте
3. ✅ API ключ создан в том же проекте
4. ✅ API ключ ограничен Custom Search API
5. ✅ Переменные окружения обновлены на Vercel
6. ✅ Проект передеплоен
7. ✅ Подождали 10-15 минут

Если все это сделано, но ошибка сохраняется - используйте Bing Search API.

