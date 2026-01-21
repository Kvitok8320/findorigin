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

2. Создайте файл `.env.local` на основе `.env.local.example`:
```bash
cp .env.local.example .env.local
```

3. Заполните переменные окружения в `.env.local`:
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
│   │   └── telegram/
│   │       └── route.ts    # Webhook endpoint для Telegram
│   ├── layout.tsx           # Корневой layout
│   └── page.tsx             # Главная страница
├── public/                  # Статические файлы
├── .env.local              # Переменные окружения (не в git)
├── next.config.js          # Конфигурация Next.js
├── package.json            # Зависимости проекта
└── tsconfig.json           # Конфигурация TypeScript
```
