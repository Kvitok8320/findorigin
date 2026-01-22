# Как включить Custom Search API в Google Cloud Console

## Пошаговая инструкция с точными путями:

### Шаг 1: Откройте Google Cloud Console

1. Перейдите на **https://console.cloud.google.com**
2. Войдите в свой Google аккунт

### Шаг 2: Выберите или создайте проект

1. Вверху страницы найдите выпадающий список с названием проекта (рядом с логотипом Google Cloud)
2. Нажмите на него
3. Если проекта нет:
   - Нажмите **"New Project"** (Новый проект)
   - Введите название (например: "FindOrigin Bot")
   - Нажмите **"Create"**
4. Если проект есть - выберите его из списка

### Шаг 3: Откройте библиотеку API

**Способ 1 (через меню):**
1. В левом меню найдите **"APIs & Services"** (APIs и сервисы)
2. Нажмите на **"Library"** (Библиотека)

**Способ 2 (прямая ссылка):**
- Перейдите на: **https://console.cloud.google.com/apis/library**

### Шаг 4: Найдите Custom Search API

1. В поисковой строке вверху страницы введите: **"Custom Search API"**
2. В результатах поиска найдите **"Custom Search API"** (от Google)
3. Нажмите на него

### Шаг 5: Включите API

1. На странице Custom Search API нажмите большую кнопку **"ENABLE"** (Включить)
2. Подождите несколько секунд - появится сообщение об успешном включении

### Шаг 6: Проверка

После включения вы увидите:
- Кнопка изменится на **"MANAGE"** (Управление)
- Статус покажет, что API включен

## Альтернативный путь (если не можете найти):

1. Перейдите на: **https://console.cloud.google.com/apis/library/customsearch.googleapis.com**
2. Нажмите **"ENABLE"**

## Что дальше?

После включения API нужно:
1. Создать API ключ (APIs & Services → Credentials → Create Credentials → API Key)
2. Создать поисковую систему на https://cse.google.com
3. Добавить ключи в Vercel (Settings → Environment Variables)

Подробная инструкция: см. `GOOGLE_SEARCH_SETUP.md`

