# Как связаны поисковая машина и проект Google Cloud

## Важно понимать:

**Поисковая машина (cse.google.com) и проект Google Cloud НЕ связаны напрямую в интерфейсе.** Они связаны только через использование в коде.

## Как это работает:

### 1. Поисковая машина (cse.google.com)

- Создается на **https://cse.google.com/cse/all**
- Это отдельный сервис Google
- Не привязана к конкретному проекту Google Cloud
- Имеет свой **Search Engine ID** (например: `52fb00e8fe74e4451`)

### 2. API ключ (Google Cloud Console)

- Создается в **Google Cloud Console** в конкретном проекте
- Привязан к проекту (например: "educationcursor")
- Используется для авторизации запросов к Google API
- Должен иметь доступ к **Custom Search API** в этом проекте

### 3. Связь между ними

Они связаны только через **использование в коде**:

```
API ключ (из Google Cloud) + Search Engine ID (из cse.google.com) = Работающий поиск
```

В коде это выглядит так:
```javascript
const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=запрос`;
```

## Где посмотреть связку:

### Нет прямого способа посмотреть связку в интерфейсе

В Google Cloud Console или на cse.google.com нет места, где показана связь между ними.

### Как проверить, что они работают вместе:

1. **Проверьте API ключ:**
   - Google Cloud Console → "APIs & Services" → "Credentials"
   - Убедитесь, что ключ ограничен Custom Search API

2. **Проверьте Search Engine ID:**
   - https://cse.google.com/cse/all
   - Найдите вашу поисковую систему
   - Скопируйте Search Engine ID

3. **Проверьте, что они используются вместе:**
   - В коде бота используются оба значения
   - `GOOGLE_API_KEY` = ключ из Google Cloud
   - `GOOGLE_SEARCH_ENGINE_ID` = ID из cse.google.com

## Почему возникает ошибка 403:

Ошибка "This project does not have the access to Custom Search JSON API" означает:

- ❌ API ключ не имеет доступа к Custom Search API в проекте Google Cloud
- ✅ Это НЕ проблема с поисковой машиной на cse.google.com

## Что нужно проверить:

1. **В Google Cloud Console:**
   - Проект "educationcursor" выбран
   - Custom Search API включен в этом проекте
   - API ключ создан в этом проекте
   - API ключ ограничен Custom Search API

2. **На cse.google.com:**
   - Поисковая машина создана
   - Search Engine ID скопирован правильно

3. **В Vercel:**
   - `GOOGLE_API_KEY` = ключ из Google Cloud
   - `GOOGLE_SEARCH_ENGINE_ID` = ID из cse.google.com

## Итог:

- Поисковая машина и проект Google Cloud **не связаны напрямую**
- Они работают вместе только через использование в коде
- Ошибка 403 связана с **проектом Google Cloud**, а не с поисковой машиной
- Проверьте, что Custom Search API включен в правильном проекте

