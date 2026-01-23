/**
 * Интеграция с Yandex Cloud Search API v2
 * Документация: https://yandex.cloud/en/services/search-api
 * 
 * ВАЖНО: Это API для поиска по ВСЕМУ ИНТЕРНЕТУ, а не по конкретному сайту.
 * 
 * Требует:
 * 1. Регистрацию в Yandex Cloud: https://console.cloud.yandex.ru
 * 2. Создание сервисного аккаунта
 * 3. Получение IAM токена или API ключа
 * 4. Назначение роли "ml.search-api.user" или "viewer"
 */

import { SearchResult, getSourceType } from '../source-searcher';

export interface YandexSearchOptions {
  apiKey: string; // IAM токен или API ключ из Yandex Cloud
  folderId?: string; // ID папки в Yandex Cloud
  maxResults?: number;
}

/**
 * Поиск через Yandex Cloud Search API v2
 * 
 * Использует REST API v2 для поиска по всему интернету
 * Документация: https://yandex.cloud/en/services/search-api
 */
export async function searchWithYandex(
  query: string,
  options: YandexSearchOptions
): Promise<SearchResult[]> {
  const { apiKey, folderId, maxResults = 10 } = options;

  try {
    // Yandex Cloud Search API v2 REST endpoint
    // Пробуем стандартный endpoint для API v2
    const endpoint = folderId 
      ? `https://search-api.cloud.yandex.net/v2/search?folderId=${folderId}`
      : 'https://search-api.cloud.yandex.net/v2/search';

    console.log('[YANDEX_SEARCH] Using Yandex Cloud Search API v2');
    console.log('[YANDEX_SEARCH] Endpoint:', endpoint.replace(apiKey, '***'));
    console.log('[YANDEX_SEARCH] Query:', query.substring(0, 50));
    console.log('[YANDEX_SEARCH] Folder ID:', folderId || 'not set');

    // Формируем запрос согласно документации API v2
    const requestBody = {
      query: query,
      pageSize: Math.min(maxResults, 50),
      pageNumber: 0,
    };

    console.log('[YANDEX_SEARCH] Request body:', JSON.stringify(requestBody));
    console.log('[YANDEX_SEARCH] Sending fetch request...');
    const fetchStartTime = Date.now();

    // Добавляем таймаут для fetch запроса (15 секунд)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('[YANDEX_SEARCH] Fetch timeout after 15 seconds');
      controller.abort();
    }, 15000);

    let response;
    try {
      console.log('[YANDEX_SEARCH] Fetch call started at', new Date().toISOString());
      response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`, // IAM токен или API ключ
          'Content-Type': 'application/json',
          'User-Agent': 'FindOrigin-Bot/1.0',
        },
        body: JSON.stringify(requestBody),
      });
      clearTimeout(timeoutId);
      console.log('[YANDEX_SEARCH] Fetch call completed at', new Date().toISOString());
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const fetchDuration = Date.now() - fetchStartTime;
      console.error('[YANDEX_SEARCH] Fetch failed after', fetchDuration, 'ms');
      console.error('[YANDEX_SEARCH] Fetch error name:', fetchError?.name);
      console.error('[YANDEX_SEARCH] Fetch error message:', fetchError?.message);
      console.error('[YANDEX_SEARCH] Fetch error code:', fetchError?.code);
      if (fetchError?.cause) {
        console.error('[YANDEX_SEARCH] Fetch error cause:', fetchError.cause);
      }
      throw new Error(`Yandex Cloud Search API v2 fetch error: ${fetchError?.message || 'Unknown error'}`);
    }

    const fetchDuration = Date.now() - fetchStartTime;
    console.log('[YANDEX_SEARCH] Fetch completed in', fetchDuration, 'ms');
    console.log('[YANDEX_SEARCH] Response status:', response.status);
    console.log('[YANDEX_SEARCH] Response ok:', response.ok);
    console.log('[YANDEX_SEARCH] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[YANDEX_SEARCH] Error response:', errorText);
      
      // Если 401/403, возможно нужен другой формат авторизации
      if (response.status === 401 || response.status === 403) {
        console.log('[YANDEX_SEARCH] Auth error, trying alternative format...');
        
        // Пробуем альтернативный формат авторизации
        const altResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Api-Key ${apiKey}`, // Альтернативный формат
            'Content-Type': 'application/json',
            'User-Agent': 'FindOrigin-Bot/1.0',
          },
          body: JSON.stringify(requestBody),
        });

        if (!altResponse.ok) {
          const altErrorText = await altResponse.text().catch(() => 'Unknown error');
          throw new Error(`Yandex Cloud Search API v2 error: ${altResponse.status} - ${altErrorText}`);
        }

        const altData = await altResponse.json();
        return parseYandexSearchResults(altData, maxResults);
      }
      
      throw new Error(`Yandex Cloud Search API v2 error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[YANDEX_SEARCH] Received response from API v2');
    
    return parseYandexSearchResults(data, maxResults);
  } catch (error) {
    console.error('[YANDEX_SEARCH] Error searching with Yandex Cloud Search API v2:', error);
    throw error;
  }
}

/**
 * Парсинг результатов поиска из Yandex Cloud Search API v2
 */
function parseYandexSearchResults(data: any, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  // Пробуем разные форматы ответа API v2
  const items = data.results || data.items || data.webPages?.value || [];

  for (const item of items.slice(0, maxResults)) {
    const url = item.url || item.link || item.uri || '';
    const title = item.title || item.name || '';
    const snippet = item.snippet || item.description || item.passage || '';

    if (url && title) {
      results.push({
        title,
        url,
        snippet,
        sourceType: getSourceType(url),
      });
    }
  }

  console.log('[YANDEX_SEARCH] Parsed results:', results.length);
  return results;
}
