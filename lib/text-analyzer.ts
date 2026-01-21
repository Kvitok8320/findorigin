/**
 * Анализ текста и извлечение ключевой информации
 */

export interface ExtractedData {
  keyClaims: string[];
  dates: string[];
  numbers: string[];
  names: string[];
  links: string[];
  searchQueries: string[];
}

/**
 * Выделение ключевых утверждений из текста
 */
export function extractKeyClaims(text: string): string[] {
  // Простая реализация: разбиение на предложения и фильтрация
  // В продакшене можно использовать NLP библиотеки или AI
  
  const sentences = text
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20); // Фильтруем короткие предложения

  // Выбираем предложения, которые выглядят как утверждения
  const claims = sentences.filter(sentence => {
    // Исключаем вопросы
    if (sentence.includes('?')) return false;
    
    // Исключаем восклицания без содержания
    if (sentence.match(/^[А-ЯA-Z\s!]+$/)) return false;
    
    return true;
  });

  // Возвращаем топ-3 наиболее информативных утверждения
  return claims.slice(0, 3);
}

/**
 * Извлечение дат из текста
 */
export function extractDates(text: string): string[] {
  const datePatterns = [
    // Формат DD.MM.YYYY или DD/MM/YYYY
    /\b(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})\b/g,
    // Формат YYYY-MM-DD
    /\b(\d{4}-\d{1,2}-\d{1,2})\b/g,
    // Текстовые даты (январь 2024, 1 января и т.д.)
    /\b(\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{4})\b/gi,
    /\b((?:январь|февраль|март|апрель|май|июнь|июль|август|сентябрь|октябрь|ноябрь|декабрь)\s+\d{4})\b/gi,
  ];

  const dates: string[] = [];
  
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  });

  return [...new Set(dates)]; // Удаляем дубликаты
}

/**
 * Извлечение чисел и статистики
 */
export function extractNumbers(text: string): string[] {
  // Ищем числа с контекстом (проценты, суммы, количества)
  const numberPatterns = [
    // Проценты
    /\b(\d+(?:[.,]\d+)?%)\b/g,
    // Большие числа с разделителями
    /\b(\d{1,3}(?:\s+\d{3})*(?:[.,]\d+)?)\b/g,
    // Обычные числа
    /\b(\d+(?:[.,]\d+)?)\b/g,
  ];

  const numbers: string[] = [];
  
  numberPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      numbers.push(...matches);
    }
  });

  // Фильтруем слишком маленькие числа (меньше 2 знаков, если не процент)
  return [...new Set(numbers.filter(n => n.length >= 2 || n.includes('%')))]; 
}

/**
 * Извлечение имен собственных (базовая реализация)
 */
export function extractNames(text: string): string[] {
  // Простая эвристика: слова с заглавной буквы, которые не в начале предложения
  // В продакшене лучше использовать NER (Named Entity Recognition)
  
  const words = text.split(/\s+/);
  const names: string[] = [];
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i].replace(/[.,!?;:()\[\]{}"]/g, '');
    
    // Проверяем, что слово начинается с заглавной буквы и достаточно длинное
    if (word.length >= 3 && /^[А-ЯЁA-Z]/.test(word)) {
      // Исключаем общие слова
      const commonWords = ['Это', 'Также', 'Однако', 'Поэтому', 'Который', 'Которые'];
      if (!commonWords.includes(word)) {
        names.push(word);
      }
    }
  }

  return [...new Set(names)].slice(0, 10); // Ограничиваем количество
}

/**
 * Извлечение ссылок из текста
 */
export function extractLinks(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s]+/g;
  const matches = text.match(urlPattern);
  return matches || [];
}

/**
 * Формирование поисковых запросов на основе извлеченной информации
 */
export function generateSearchQueries(data: ExtractedData, originalText: string): string[] {
  const queries: string[] = [];

  // Запрос 1: Основной текст (первые 100 символов)
  const mainText = originalText.substring(0, 100).trim();
  if (mainText.length > 20) {
    queries.push(mainText);
  }

  // Запрос 2: Ключевые утверждения
  if (data.keyClaims.length > 0) {
    queries.push(...data.keyClaims.slice(0, 2));
  }

  // Запрос 3: Комбинация имен и дат
  if (data.names.length > 0 && data.dates.length > 0) {
    queries.push(`${data.names[0]} ${data.dates[0]}`);
  }

  // Запрос 4: Комбинация имен и чисел
  if (data.names.length > 0 && data.numbers.length > 0) {
    queries.push(`${data.names[0]} ${data.numbers[0]}`);
  }

  // Удаляем дубликаты и ограничиваем количество
  return [...new Set(queries)].slice(0, 5);
}

/**
 * Полный анализ текста
 */
export function analyzeText(text: string): ExtractedData {
  const keyClaims = extractKeyClaims(text);
  const dates = extractDates(text);
  const numbers = extractNumbers(text);
  const names = extractNames(text);
  const links = extractLinks(text);

  const data: ExtractedData = {
    keyClaims,
    dates,
    numbers,
    names,
    links,
    searchQueries: [],
  };

  data.searchQueries = generateSearchQueries(data, text);

  return data;
}

