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
    console.log('[TELEGRAM] Starting fetch request...');
    
    const fetchStartTime = Date.now();
    
    // Добавляем таймаут для fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('[TELEGRAM] Fetch timeout after 10 seconds');
      controller.abort();
    }, 10000); // 10 секунд таймаут
    
    let response;
    try {
      console.log('[TELEGRAM] Creating fetch request with body:', JSON.stringify({
        chat_id: chatId,
        text: text.substring(0, 50) + '...',
        ...options,
      }));
      
      const fetchPromise = fetch(url, {
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
        signal: controller.signal,
      });
      
      console.log('[TELEGRAM] Fetch promise created, awaiting...');
      response = await fetchPromise;
      console.log('[TELEGRAM] Fetch promise resolved');
      
      clearTimeout(timeoutId);
      const fetchDuration = Date.now() - fetchStartTime;
      console.log('[TELEGRAM] Fetch completed in', fetchDuration, 'ms');
      console.log('[TELEGRAM] Response status:', response.status);
      console.log('[TELEGRAM] Response ok:', response.ok);
      console.log('[TELEGRAM] Response headers:', Object.fromEntries(response.headers.entries()));
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const fetchDuration = Date.now() - fetchStartTime;
      console.error('[TELEGRAM] Fetch failed after', fetchDuration, 'ms');
      console.error('[TELEGRAM] Fetch error type:', typeof fetchError);
      console.error('[TELEGRAM] Fetch error name:', fetchError?.name);
      console.error('[TELEGRAM] Fetch error message:', fetchError?.message);
      console.error('[TELEGRAM] Fetch error code:', fetchError?.code);
      console.error('[TELEGRAM] Fetch error cause:', fetchError?.cause);
      console.error('[TELEGRAM] Is AbortError:', fetchError?.name === 'AbortError');
      if (fetchError?.stack) {
        console.error('[TELEGRAM] Fetch error stack:', fetchError.stack.substring(0, 500));
      }
      throw fetchError;
    }

    console.log('[TELEGRAM] Checking response status...');
    if (!response.ok) {
      console.error('[TELEGRAM] Response not OK, reading error text...');
      const errorText = await response.text();
      console.error('[TELEGRAM] Error response text:', errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { description: errorText || 'Unknown error' };
      }
      console.error('[TELEGRAM] Parsed error:', JSON.stringify(error));
      throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
    }

    console.log('[TELEGRAM] Response OK, parsing JSON...');
    const result = await response.json();
    console.log('[TELEGRAM] JSON parsed successfully');
    console.log('[TELEGRAM] Message sent successfully');
    console.log('[TELEGRAM] Response result:', JSON.stringify(result).substring(0, 100));
    return result;
  } catch (error: any) {
    // Логируем детали ошибки для диагностики
    console.error('[TELEGRAM] Send message error occurred!');
    console.error('[TELEGRAM] Error type:', typeof error);
    console.error('[TELEGRAM] Error name:', error?.name || 'Unknown');
    console.error('[TELEGRAM] Error message:', error?.message || String(error));
    console.error('[TELEGRAM] Error code:', error?.code || 'No code');
    console.error('[TELEGRAM] Error cause:', error?.cause || 'No cause');
    console.error('[TELEGRAM] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)).substring(0, 500));
    if (error?.stack) {
      console.error('[TELEGRAM] Error stack:', error.stack.substring(0, 1000));
    }
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

