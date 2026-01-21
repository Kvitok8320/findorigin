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
  const url = `${API_BASE}/sendMessage`;
  
  try {
    console.log('[TELEGRAM] Sending message to:', url);
    console.log('[TELEGRAM] Chat ID:', chatId);
    console.log('[TELEGRAM] Text length:', text.length);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FindOrigin-Bot/1.0',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options,
      }),
      // Явно указываем, что это внешний запрос
      cache: 'no-store',
    });

    console.log('[TELEGRAM] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TELEGRAM] Error response:', errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { description: errorText || 'Unknown error' };
      }
      throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log('[TELEGRAM] Message sent successfully');
    return result;
  } catch (error: any) {
    // Логируем детали ошибки для диагностики
    console.error('[TELEGRAM] Send message error:', {
      url,
      chatId,
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack,
    });
    throw error;
  }
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
  
  try {
    const response = await fetch(`${API_BASE}/getMe`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ description: 'Unknown error' }));
      throw new Error(`Failed to get bot info: ${JSON.stringify(error)}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('[TELEGRAM] Get me error:', error.message);
    throw error;
  }
}

/**
 * Получение информации о сообщении по chat_id и message_id
 * Примечание: Telegram API не предоставляет прямой метод для получения сообщения по ID,
 * но можно использовать forwardMessage или другие методы
 */
export async function getChat(chatId: number | string) {
  const API_BASE = getApiBase();
  
  try {
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
      const error = await response.json().catch(() => ({ description: 'Unknown error' }));
      throw new Error(`Failed to get chat: ${JSON.stringify(error)}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('[TELEGRAM] Get chat error:', error.message);
    throw error;
  }
}

