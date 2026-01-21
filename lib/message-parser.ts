/**
 * Парсинг и обработка сообщений от Telegram
 */

import type { TelegramUpdate } from './types';
export type { TelegramUpdate };

export interface ParsedMessage {
  chatId: number;
  messageId: number;
  text: string;
  isLink: boolean;
  telegramLink?: {
    channel: string;
    messageId: number;
  };
}

/**
 * Извлечение chat.id и text из update.message
 */
export function parseUpdate(update: TelegramUpdate): ParsedMessage | null {
  if (!update.message) {
    return null;
  }

  const { message } = update;
  const chatId = message.chat.id;
  const messageId = message.message_id;
  const text = message.text || '';

  // Проверка на ссылку на Telegram-пост
  const telegramLink = parseTelegramLink(text);

  return {
    chatId,
    messageId,
    text,
    isLink: !!telegramLink,
    telegramLink,
  };
}

/**
 * Парсинг ссылки на Telegram-пост
 * Форматы: t.me/channel/message_id или https://t.me/channel/message_id
 */
export function parseTelegramLink(text: string): { channel: string; messageId: number } | null {
  // Регулярное выражение для поиска ссылок на Telegram-посты
  const telegramLinkRegex = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/;
  const match = text.match(telegramLinkRegex);

  if (!match) {
    return null;
  }

  const channel = match[1];
  const messageId = parseInt(match[2], 10);

  if (isNaN(messageId)) {
    return null;
  }

  return { channel, messageId };
}

/**
 * Валидация формата ссылки на Telegram-пост
 */
export function isValidTelegramLink(text: string): boolean {
  return parseTelegramLink(text) !== null;
}

/**
 * Проверка, является ли сообщение текстом или ссылкой
 */
export function isTextMessage(text: string): boolean {
  return text.trim().length > 0 && !isValidTelegramLink(text);
}

