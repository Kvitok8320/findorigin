# Проверка документации Yandex Cloud Search API v2

## Проблема

Запрос к API зависает или падает без ошибок. Логи обрываются на "Fetch call started at".

## Что нужно проверить в документации

В Yandex Cloud Console на странице Search API:

1. **Откройте "Документация"** (синяя ссылка на странице Search API)

2. **Проверьте:**
   - Правильный endpoint для REST API v2
   - Формат авторизации (Bearer token или другой)
   - Формат запроса (структура body)
   - Нужен ли folderId в URL, заголовке или body
   - Примеры запросов

3. **Важные вопросы:**
   - Какой точный URL для REST API v2?
   - Какой формат авторизации? (`Bearer ${token}` или `Api-Key ${key}`?)
   - Какая структура body запроса?
   - Где указывать folderId?

## Текущие предположения в коде:

- Endpoint: `https://search-api.cloud.yandex.net/v2/search`
- Авторизация: `Bearer ${apiKey}`
- Body: `{ query, pageSize, pageNumber }`
- folderId: в query параметрах `?folderId=...`

**Возможно, это неверно!** Нужна документация из Yandex Cloud Console.

## Что сделать:

1. Откройте документацию в Yandex Cloud Console
2. Найдите раздел про REST API v2
3. Скопируйте пример запроса
4. Пришлите пример или опишите, что там написано

