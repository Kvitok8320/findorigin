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
    // Yandex Cloud Search API v2 REST endpoint (из документации)
    const endpoint = 'https://searchapi.api.cloud.yandex.net/v2/web/search';

    console.log('[YANDEX_SEARCH] Using Yandex Cloud Search API v2');
    console.log('[YANDEX_SEARCH] Endpoint:', endpoint);
    console.log('[YANDEX_SEARCH] Query:', query.substring(0, 50));
    console.log('[YANDEX_SEARCH] Folder ID:', folderId || 'not set');

    if (!folderId) {
      throw new Error('YANDEX_FOLDER_ID is required for Yandex Cloud Search API v2');
    }

    // Формируем запрос согласно документации API v2
    // Документация: https://yandex.cloud/ru/docs/search-api/api-ref/rest/WebSearch/search
    const requestBody = {
      query: {
        searchType: 'SEARCH_TYPE_RU', // Поиск по русскоязычному интернету
        queryText: query, // Обязательное поле
        familyMode: 'FAMILY_MODE_MODERATE', // Умеренная фильтрация
        page: '0',
        fixTypoMode: 'FIX_TYPO_MODE_ON', // Автоисправление опечаток
      },
      sortSpec: {
        sortMode: 'SORT_MODE_BY_RELEVANCE', // Сортировка по релевантности
        sortOrder: 'SORT_ORDER_DESC', // От новых к старым
      },
      groupSpec: {
        groupMode: 'GROUP_MODE_DEEP', // Группировка по доменам
        groupsOnPage: String(Math.min(maxResults, 100)), // Количество групп на странице
        docsInGroup: '1', // Количество документов в группе
      },
      maxPassages: '3', // Максимальное количество пассажей для сниппета
      region: '225', // Россия (код региона)
      l10n: 'LOCALIZATION_RU', // Русский язык
      folderId: folderId, // ID папки (обязательно)
      responseFormat: 'FORMAT_XML', // Формат ответа: XML
      userAgent: 'FindOrigin-Bot/1.0',
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
      // Авторизация согласно документации Yandex Cloud
      // Проверяем раздел "Аутентификация в API" для точного формата
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'FindOrigin-Bot/1.0',
        'Authorization': `Bearer ${apiKey}`, // IAM токен или API ключ
      };
      
      console.log('[YANDEX_SEARCH] Request headers (without auth):', { ...headers, Authorization: 'Bearer ***' });
      console.log('[YANDEX_SEARCH] Full request URL:', endpoint);
      
      response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers,
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

    // Ответ приходит в формате XML или HTML (в зависимости от responseFormat)
    // В нашем случае FORMAT_XML, поэтому ответ будет XML строкой в поле rawData
    const data = await response.json();
    console.log('[YANDEX_SEARCH] Received response from API v2');
    console.log('[YANDEX_SEARCH] Response has rawData:', !!data.rawData);
    console.log('[YANDEX_SEARCH] rawData length:', data.rawData?.length || 0);
    
    if (!data.rawData) {
      console.error('[YANDEX_SEARCH] No rawData in response:', data);
      return [];
    }
    
    // rawData содержит XML строку, нужно распарсить
    return parseYandexSearchResults(data.rawData, maxResults);
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorName = error?.name || typeof error;
    const errorStack = error?.stack || 'No stack';
    
    console.error('[YANDEX_SEARCH] Error searching with Yandex Cloud Search API v2');
    console.error('[YANDEX_SEARCH] Error name:', errorName);
    console.error('[YANDEX_SEARCH] Error message:', errorMessage);
    console.error('[YANDEX_SEARCH] Error stack:', errorStack);
    
    if (error?.cause) {
      console.error('[YANDEX_SEARCH] Error cause:', error.cause);
    }
    
    throw error;
  }
}

/**
 * Парсинг результатов поиска из Yandex Cloud Search API v2
 * 
 * rawData содержит XML строку в формате Яндекс.Поиска
 */
function parseYandexSearchResults(rawData: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  if (!rawData || typeof rawData !== 'string') {
    console.error('[YANDEX_SEARCH] Invalid rawData format:', typeof rawData);
    return [];
  }

  console.log('[YANDEX_SEARCH] Parsing XML response, length:', rawData.length);

  // Парсим XML используя регулярные выражения
  // Формат Яндекс.Поиска: <doc><url>...</url><title>...</title><passage>...</passage></doc>
  const docMatches = rawData.match(/<doc>[\s\S]*?<\/doc>/g);
  
  if (docMatches) {
    console.log('[YANDEX_SEARCH] Found', docMatches.length, 'documents in XML');
    
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
  } else {
    console.log('[YANDEX_SEARCH] No <doc> tags found in XML response');
    // Пробуем альтернативный формат, если есть
    console.log('[YANDEX_SEARCH] First 500 chars of rawData:', rawData.substring(0, 500));
  }

  console.log('[YANDEX_SEARCH] Parsed results:', results.length);
  return results;
}
