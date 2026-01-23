/**
 * Интеграция с API Яндекс.Поиска для сайта
 * Документация: https://yandex.ru/dev/site/api/
 * 
 * ВАЖНО: Используется "API Яндекс.Поиска для сайта" из Кабинета разработчика.
 * Это НЕ Yandex Cloud Search API.
 * 
 * Для получения ключа:
 * 1. Перейдите на https://developer.tech.yandex.ru
 * 2. Создайте ключ для "API Яндекс.Поиска для сайта"
 * 3. Подключите ключ к поиску на https://site.yandex.ru/searches/
 */

import { SearchResult, getSourceType } from '../source-searcher';

export interface YandexSearchOptions {
  apiKey: string;
  folderId?: string; // ID папки в Yandex Cloud (опционально)
  maxResults?: number;
}

/**
 * Поиск через Yandex Cloud Search API
 * 
 * Использует новый API через Yandex Cloud gateway
 * Документация: https://yandex.cloud/en/services/search-api
 */
export async function searchWithYandex(
  query: string,
  options: YandexSearchOptions
): Promise<SearchResult[]> {
  const { apiKey, folderId, maxResults = 10 } = options;

  try {
    // Yandex Cloud Search API endpoint
    // Пробуем использовать новый endpoint через Yandex Cloud
    const url = new URL('https://yandex.ru/search/xml');
    
    // Пробуем новый формат авторизации через Yandex Cloud
    // Если у нас есть folderId, используем его
    if (folderId) {
      url.searchParams.set('folderId', folderId);
    }
    
    // Используем API ключ как IAM токен
    url.searchParams.set('key', apiKey);
    url.searchParams.set('query', query);
    url.searchParams.set('page', '0');
    url.searchParams.set('groupby', `attr=d.mode=deep.groups-on-page=${Math.min(maxResults, 100)}`);

    console.log('[YANDEX_SEARCH] Sending request to Yandex Cloud Search API...');
    console.log('[YANDEX_SEARCH] Using key:', apiKey.substring(0, 10) + '...');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'FindOrigin-Bot/1.0',
        'Accept': 'application/xml, text/xml, application/json',
        'Authorization': `Api-Key ${apiKey}`, // Пробуем новый формат авторизации
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[YANDEX_SEARCH] Error response:', errorText);
      
      // Если ошибка про старый API, пробуем альтернативный подход
      if (errorText.includes('old authorization type') || errorText.includes('Yandex Cloud gateway')) {
        console.log('[YANDEX_SEARCH] Old API format detected, trying alternative approach...');
        
        // Альтернативный подход: используем публичный API Яндекс.Поиска
        // через веб-интерфейс (требует другой метод)
        throw new Error('Yandex Cloud Search API requires Yandex Cloud setup. Please configure Yandex Cloud Search API in Yandex Cloud Console.');
      }
      
      throw new Error(`Yandex Search API error: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('[YANDEX_SEARCH] Received response, length:', responseText.length);

    // Пробуем парсить как JSON (новый формат)
    let results: SearchResult[] = [];
    
    try {
      const jsonData = JSON.parse(responseText);
      if (jsonData.results && Array.isArray(jsonData.results)) {
        results = jsonData.results.slice(0, maxResults).map((item: any) => ({
          title: item.title || item.name || '',
          url: item.url || item.link || '',
          snippet: item.snippet || item.description || '',
          sourceType: getSourceType(item.url || item.link || ''),
        }));
      }
    } catch (jsonError) {
      // Если не JSON, пробуем XML
      console.log('[YANDEX_SEARCH] Response is not JSON, trying XML parsing...');
      
      // Парсим XML используя регулярные выражения
      const docMatches = responseText.match(/<doc>[\s\S]*?<\/doc>/g);
      
      if (docMatches) {
        for (const docXml of docMatches.slice(0, maxResults)) {
          const urlMatch = docXml.match(/<url>([\s\S]*?)<\/url>/);
          const titleMatch = docXml.match(/<title>([\s\S]*?)<\/title>/);
          const passageMatch = docXml.match(/<passage>([\s\S]*?)<\/passage>/);

          if (urlMatch && titleMatch) {
            const url = urlMatch[1].trim();
            const title = titleMatch[1].trim();
            const snippet = passageMatch ? passageMatch[1].trim() : '';

            results.push({
              title,
              url,
              snippet,
              sourceType: getSourceType(url),
            });
          }
        }
      }
    }

    console.log('[YANDEX_SEARCH] Parsed results:', results.length);
    return results;
  } catch (error) {
    console.error('[YANDEX_SEARCH] Error searching with Yandex:', error);
    throw error;
  }
}
