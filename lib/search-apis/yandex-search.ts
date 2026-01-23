/**
 * Интеграция с Яндекс.Поиск API
 * Документация: https://yandex.ru/dev/site/api/
 * 
 * Примечание: Яндекс.Поиск API использует XML формат.
 * 
 * ВАЖНО: Яндекс.Поиск API требует регистрации в Кабинете разработчика
 * и получения API ключа на https://developer.tech.yandex.ru
 */

import { SearchResult, getSourceType } from '../source-searcher';

export interface YandexSearchOptions {
  apiKey: string;
  maxResults?: number;
}

/**
 * Поиск через Яндекс.Поиск API
 * 
 * Использует API Яндекс.Поиска для сайта (XML формат)
 * Документация: https://yandex.ru/dev/site/api/
 * 
 * Для получения API ключа:
 * 1. Перейдите на https://developer.tech.yandex.ru
 * 2. Создайте ключ для "API Яндекс.Поиска для сайта"
 */
export async function searchWithYandex(
  query: string,
  options: YandexSearchOptions
): Promise<SearchResult[]> {
  const { apiKey, maxResults = 10 } = options;

  try {
    // Яндекс.Поиск API использует XML формат
    // Endpoint: https://yandex.ru/search/xml
    const url = new URL('https://yandex.ru/search/xml');
    url.searchParams.set('user', apiKey);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('query', query);
    url.searchParams.set('page', '0');
    url.searchParams.set('groupby', `attr=d.mode=deep.groups-on-page=${Math.min(maxResults, 100)}`);

    console.log('[YANDEX_SEARCH] Sending request to:', url.toString().replace(apiKey, '***'));

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'FindOrigin-Bot/1.0',
        'Accept': 'application/xml, text/xml',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[YANDEX_SEARCH] Error response:', errorText);
      throw new Error(`Yandex Search API error: ${response.status} - ${errorText}`);
    }

    const xmlText = await response.text();
    console.log('[YANDEX_SEARCH] Received XML response, length:', xmlText.length);

    // Парсим XML используя регулярные выражения (простой подход для Node.js)
    // В продакшене лучше использовать библиотеку типа 'xml2js' или 'fast-xml-parser'
    const results: SearchResult[] = [];
    
    // Извлекаем все блоки <doc>...</doc>
    const docMatches = xmlText.match(/<doc>[\s\S]*?<\/doc>/g);
    
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

    console.log('[YANDEX_SEARCH] Parsed results:', results.length);
    return results;
  } catch (error) {
    console.error('[YANDEX_SEARCH] Error searching with Yandex:', error);
    throw error;
  }
}
