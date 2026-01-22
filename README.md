# FindOrigin

Telegram-бот для поиска источников информации.

## Описание

FindOrigin — это Telegram-бот, который получает текст или ссылку на пост и пытается найти источник этой информации.

## Технологии

- Next.js 14 (App Router)
- TypeScript
- Vercel (деплой)

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

3. Заполните переменные окружения в `.env`:
   - `TELEGRAM_BOT_TOKEN` - токен бота от BotFather
   - `TELEGRAM_API_URL` - базовый URL Telegram API (по умолчанию: https://api.telegram.org/bot)

## Разработка

Запуск dev сервера:
```bash
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000)

## Деплой

Проект настроен для деплоя на Vercel. Подключите репозиторий к Vercel и настройте переменные окружения в панели управления.

## Структура проекта

```
findorigin/
├── app/
│   ├── api/
│   │   ├── telegram/
│   │   │   └── route.ts       # Webhook endpoint для Telegram
│   │   └── webhook/
│   │       └── set/
│   │           └── route.ts    # Endpoint для установки webhook
│   ├── layout.tsx              # Корневой layout
│   └── page.tsx                # Главная страница
├── lib/
│   ├── telegram.ts              # Утилиты для работы с Telegram API
│   ├── message-parser.ts        # Парсинг сообщений от Telegram
│   ├── telegram-post-extractor.ts # Извлечение текста из Telegram-постов
│   ├── text-analyzer.ts         # Анализ текста и извлечение информации
│   ├── source-searcher.ts       # Поиск источников информации
│   └── types.ts                 # Общие типы
├── public/                      # Статические файлы
├── .env                   # Переменные окружения (не в git)
├── env.example                  # Пример переменных окружения
├── next.config.js               # Конфигурация Next.js
├── package.json                 # Зависимости проекта
└── tsconfig.json                # Конфигурация TypeScript
```

## Настройка

### 1. Создание Telegram бота

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot` и следуйте инструкциям
3. Сохраните полученный токен бота

### 2. Настройка переменных окружения

Создайте файл `.env` на основе `env.example` и заполните:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_API_URL=https://api.telegram.org/bot
```

### 3. Настройка поискового API (опционально)

Для работы функции поиска источников необходимо настроить один из следующих сервисов:

- **Google Custom Search API**: добавьте `GOOGLE_API_KEY` и `GOOGLE_SEARCH_ENGINE_ID`
- **Bing Search API**: добавьте `BING_API_KEY`
- **SerpAPI**: добавьте `SERPAPI_KEY`

Без настроенного поискового API бот будет работать, но не сможет находить источники.

### 4. Установка webhook

После деплоя на Vercel установите webhook:

```bash
# Замените YOUR_DOMAIN на ваш домен Vercel
curl -X POST https://YOUR_DOMAIN.vercel.app/api/webhook/set \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_DOMAIN.vercel.app/api/telegram"}'
```

Или используйте Telegram API напрямую:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_DOMAIN.vercel.app/api/telegram"}'
```

## Использование

1. Найдите вашего бота в Telegram
2. Отправьте боту:
   - Текст для анализа, или
   - Ссылку на Telegram-пост (формат: `t.me/channel/message_id`)
3. Бот проанализирует текст и найдет возможные источники

## Функциональность

- ✅ Прием текстовых сообщений
- ✅ Парсинг ссылок на Telegram-посты
- ✅ Анализ текста (извлечение дат, чисел, имен, ключевых утверждений)
- ✅ Поиск источников (требует настройки поискового API)
- ✅ Фильтрация источников по типам (официальные, новостные, блоги, исследования)
- ⏳ AI-сравнение и оценка релевантности (планируется)
