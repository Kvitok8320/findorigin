/**
 * Извлечение текста из Telegram-постов
 * 
 * Примечание: Telegram Bot API не предоставляет прямой метод для получения
 * сообщения из публичного канала по ссылке. Используем альтернативные подходы.
 */

import { sendMessage } from './telegram';

export interface TelegramPost {
  text: string;
  date?: number;
  author?: string;
}

/**
 * Извлечение текста из Telegram-поста по ссылке
 * 
 * Варианты реализации:
 * 1. Если бот добавлен в канал - использовать getUpdates или forwardMessage
 * 2. Парсинг через Telegram Web (требует внешний сервис)
 * 3. Попросить пользователя переслать сообщение боту
 * 
 * Здесь реализуем базовую логику с обработкой ошибок
 */
export async function extractTextFromTelegramPost(
  channel: string,
  messageId: number
): Promise<TelegramPost | null> {
  try {
    // Вариант 1: Если бот добавлен в канал, можно использовать forwardMessage
    // Но для этого нужен chat_id канала, который обычно неизвестен
    
    // Вариант 2: Парсинг через Telegram Web
    // Это требует внешний сервис или библиотеку для парсинга
    
    // Временное решение: возвращаем null и просим пользователя переслать сообщение
    // В продакшене можно использовать сервис типа Telethon или парсинг HTML
    
    return null;
  } catch (error) {
    console.error('Error extracting text from Telegram post:', error);
    return null;
  }
}

/**
 * Альтернативный метод: запрос у пользователя переслать сообщение
 */
export function requestMessageForward(chatId: number): Promise<void> {
  return sendMessage(
    chatId,
    'Для работы с сообщениями из каналов, пожалуйста, перешлите сообщение боту или скопируйте его текст.'
  );
}

/**
 * Очистка текста от форматирования
 */
export function cleanText(text: string): string {
  // Удаление Markdown форматирования
  let cleaned = text
    .replace(/\*\*(.*?)\*\*/g, '$1') // **bold**
    .replace(/\*(.*?)\*/g, '$1')     // *italic*
    .replace(/__(.*?)__/g, '$1')     // __bold__
    .replace(/_(.*?)_/g, '$1')       // _italic_
    .replace(/`(.*?)`/g, '$1')       // `code`
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // [link](url) -> link
    .replace(/\[([^\]]+)\]/g, '$1'); // [link] -> link

  // Удаление HTML тегов (если есть)
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Удаление лишних пробелов
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

