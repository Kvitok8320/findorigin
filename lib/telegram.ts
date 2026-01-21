/**
 * Утилиты для работы с Telegram Bot API
 */

const TELEGRAM_API_URL = process.env.TELEGRAM_API_URL || 'https://api.telegram.org/bot';

/**
 * Получение базового URL API с проверкой токена
 */
function getApiBase(): string {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
  }
  
  return `${TELEGRAM_API_URL}${BOT_TOKEN}`;
}

/**
 * Отправка сообщения через Telegram API
 */
export async function sendMessage(chatId: number, text: string, options?: {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_to_message_id?: number;
}) {
  const API_BASE = getApiBase();
  const response = await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Установка webhook
 */
export async function setWebhook(url: string, secretToken?: string) {
  const API_BASE = getApiBase();
  const response = await fetch(`${API_BASE}/setWebhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      secret_token: secretToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to set webhook: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Получение информации о боте
 */
export async function getMe() {
  const API_BASE = getApiBase();
  const response = await fetch(`${API_BASE}/getMe`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get bot info: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Получение информации о сообщении по chat_id и message_id
 * Примечание: Telegram API не предоставляет прямой метод для получения сообщения по ID,
 * но можно использовать forwardMessage или другие методы
 */
export async function getChat(chatId: number | string) {
  const API_BASE = getApiBase();
  const response = await fetch(`${API_BASE}/getChat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get chat: ${JSON.stringify(error)}`);
  }

  return response.json();
}

