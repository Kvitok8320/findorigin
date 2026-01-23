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
 * 4. Назначение роли "search-api.webSearch.user" на каталог (обязательно!)
 * 
 * Авторизация:
 * - IAM токен: Authorization: Bearer <IAM-токен>
 * - API ключ: Authorization: Api-Key <API-ключ>
 * 
 * По умолчанию используется формат Api-Key. Можно указать YANDEX_AUTH_TYPE=Bearer для IAM токенов.
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
  console.log('[YANDEX_SEARCH] Function called');
  console.log('[YANDEX_SEARCH] Options:', { 
    hasApiKey: !!options.apiKey, 
    apiKeyLength: options.apiKey?.length || 0,
    hasFolderId: !!options.folderId,
    folderId: options.folderId,
    maxResults: options.maxResults 
  });
  const { apiKey, folderId, maxResults = 10 } = options;

  try {
    // Yandex Cloud Search API v2 REST endpoint (из документации)
    const endpoint = 'https://searchapi.api.cloud.yandex.net/v2/web/search';

    console.log('[YANDEX_SEARCH] Using Yandex Cloud Search API v2');
    console.log('[YANDEX_SEARCH] Endpoint:', endpoint);
    console.log('[YANDEX_SEARCH] Query length:', query.length);
    console.log('[YANDEX_SEARCH] Query (first 100 chars):', query.substring(0, 100));
    console.log('[YANDEX_SEARCH] Folder ID:', folderId || 'not set');
    
    // Обрезаем запрос до максимальной длины (400 символов согласно документации)
    let searchQuery = query.trim();
    if (searchQuery.length > 400) {
      // Пытаемся обрезать по предложению
      const sentenceEnd = searchQuery.substring(0, 400).lastIndexOf('.');
      if (sentenceEnd > 50) {
        searchQuery = searchQuery.substring(0, sentenceEnd + 1);
      } else {
        searchQuery = searchQuery.substring(0, 400);
      }
      console.log('[YANDEX_SEARCH] Query truncated to:', searchQuery.length, 'chars (max 400)');
    }

    if (!folderId) {
      throw new Error('YANDEX_FOLDER_ID is required for Yandex Cloud Search API v2');
    }

    // Формируем запрос согласно документации API v2
    // Документация: https://yandex.cloud/ru/docs/search-api/api-ref/rest/WebSearch/search
    const requestBody = {
      query: {
        searchType: 'SEARCH_TYPE_RU', // Поиск по русскоязычному интернету
        queryText: searchQuery, // Обязательное поле (используем обрезанный запрос)
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

    // Добавляем таймаут для fetch запроса (30 секунд для Vercel)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('[YANDEX_SEARCH] Fetch timeout after 30 seconds');
      controller.abort();
    }, 30000);

    let response;
    try {
      console.log('[YANDEX_SEARCH] Fetch call started at', new Date().toISOString());
      
      // Авторизация согласно документации Yandex Cloud
      // Два формата:
      // 1. Authorization: Bearer <IAM-токен> - для IAM токенов
      // 2. Authorization: Api-Key <API-ключ> - для API ключей
      // 
      // Пробуем сначала Api-Key (так как пользователь создал API ключ),
      // если не сработает, попробуем Bearer
      const authType = process.env.YANDEX_AUTH_TYPE || 'Api-Key'; // По умолчанию Api-Key
      const authHeader = authType === 'Bearer' 
        ? `Bearer ${apiKey}` 
        : `Api-Key ${apiKey}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'FindOrigin-Bot/1.0',
        'Authorization': authHeader,
      };
      
      console.log('[YANDEX_SEARCH] Auth type:', authType);
      console.log('[YANDEX_SEARCH] Request headers (without auth):', { ...headers, Authorization: `${authType} ***` });
      console.log('[YANDEX_SEARCH] Full request URL:', endpoint);
      console.log('[YANDEX_SEARCH] Request body size:', JSON.stringify(requestBody).length, 'bytes');
      console.log('[YANDEX_SEARCH] About to call fetch...');
      console.log('[YANDEX_SEARCH] Timeout set for 30 seconds');
      console.log('[YANDEX_SEARCH] Creating fetch promise...');
      
      try {
        console.log('[YANDEX_SEARCH] Fetch promise created, awaiting response...');
        console.log('[YANDEX_SEARCH] Starting fetch call...');
        const fetchPromise = fetch(endpoint, {
          method: 'POST',
          signal: controller.signal,
          headers,
          body: JSON.stringify(requestBody),
        });
        console.log('[YANDEX_SEARCH] Fetch promise created, waiting for response...');
        console.log('[YANDEX_SEARCH] Current time:', new Date().toISOString());
        
        response = await fetchPromise;
        console.log('[YANDEX_SEARCH] Fetch promise resolved');
        clearTimeout(timeoutId);
        console.log('[YANDEX_SEARCH] Fetch call completed at', new Date().toISOString());
        console.log('[YANDEX_SEARCH] Response received, status:', response.status);
      } catch (innerError: any) {
        console.error('[YANDEX_SEARCH] Inner fetch error:', innerError?.name, innerError?.message);
        throw innerError;
      }
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
      console.error('[YANDEX_SEARCH] Error response status:', response.status);
      console.error('[YANDEX_SEARCH] Error response text:', errorText);
      
      // Если 401/403, возможно нужен другой формат авторизации или неправильная роль
      if (response.status === 401 || response.status === 403) {
        console.error('[YANDEX_SEARCH] Authorization error! Possible causes:');
        console.error('[YANDEX_SEARCH] 1. Wrong auth format (Api-Key vs Bearer)');
        console.error('[YANDEX_SEARCH] 2. Missing or incorrect role: search-api.webSearch.user');
        console.error('[YANDEX_SEARCH] 3. Role assigned to wrong resource (should be on folder)');
        const currentAuthType = process.env.YANDEX_AUTH_TYPE || 'Api-Key';
        const altAuthType = currentAuthType === 'Bearer' ? 'Api-Key' : 'Bearer';
        const altAuthHeader = altAuthType === 'Bearer' 
          ? `Bearer ${apiKey}` 
          : `Api-Key ${apiKey}`;
        
        console.log(`[YANDEX_SEARCH] Auth error with ${currentAuthType}, trying ${altAuthType} format...`);
        console.log(`[YANDEX_SEARCH] Alternative auth header format: ${altAuthType}`);
        
        // Пробуем альтернативный формат авторизации
        try {
          console.log('[YANDEX_SEARCH] Attempting alternative auth format...');
          const altResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': altAuthHeader,
              'Content-Type': 'application/json',
              'User-Agent': 'FindOrigin-Bot/1.0',
            },
            body: JSON.stringify(requestBody),
          });

          console.log('[YANDEX_SEARCH] Alternative auth response status:', altResponse.status);

          if (!altResponse.ok) {
            const altErrorText = await altResponse.text().catch(() => 'Unknown error');
            console.error('[YANDEX_SEARCH] Alternative auth also failed:', altErrorText);
            throw new Error(`Yandex Cloud Search API v2 error: ${altResponse.status} - ${altErrorText}. Tried both ${currentAuthType} and ${altAuthType} formats.`);
          }

          console.log(`[YANDEX_SEARCH] Success with ${altAuthType} format!`);
          const altData = await altResponse.json();
          
          if (!altData.rawData) {
            console.error('[YANDEX_SEARCH] No rawData in response:', altData);
            return [];
          }
          
          // Декодируем base64 если нужно
          let altXmlData = altData.rawData;
          try {
            if (typeof altXmlData === 'string' && !altXmlData.trim().startsWith('<')) {
              console.log('[YANDEX_SEARCH] Decoding base64 for alternative auth...');
              altXmlData = Buffer.from(altXmlData, 'base64').toString('utf-8');
            }
          } catch (decodeError) {
            console.warn('[YANDEX_SEARCH] Failed to decode base64 for alternative auth:', decodeError);
          }
          
          return parseYandexSearchResults(altXmlData, maxResults);
        } catch (altError: any) {
          console.error('[YANDEX_SEARCH] Alternative auth format also failed:', altError?.message);
          throw altError;
        }
      }
      
      throw new Error(`Yandex Cloud Search API v2 error: ${response.status} - ${errorText}`);
    }

    // Ответ приходит в формате XML или HTML (в зависимости от responseFormat)
    // В нашем случае FORMAT_XML, поэтому ответ будет XML строкой в поле rawData
    // rawData может быть в base64, нужно декодировать
    const data = await response.json();
    console.log('[YANDEX_SEARCH] Received response from API v2');
    console.log('[YANDEX_SEARCH] Response has rawData:', !!data.rawData);
    console.log('[YANDEX_SEARCH] rawData length:', data.rawData?.length || 0);
    
    if (!data.rawData) {
      console.error('[YANDEX_SEARCH] No rawData in response:', data);
      return [];
    }
    
    // rawData может быть в base64, декодируем если нужно
    let xmlData = data.rawData;
    try {
      // Пробуем декодировать base64
      // Если это base64, декодируем, иначе используем как есть
      if (typeof xmlData === 'string' && !xmlData.trim().startsWith('<')) {
        console.log('[YANDEX_SEARCH] rawData appears to be base64, decoding...');
        xmlData = Buffer.from(xmlData, 'base64').toString('utf-8');
        console.log('[YANDEX_SEARCH] Decoded XML length:', xmlData.length);
        console.log('[YANDEX_SEARCH] First 200 chars of decoded XML:', xmlData.substring(0, 200));
      }
    } catch (decodeError) {
      console.warn('[YANDEX_SEARCH] Failed to decode base64, using rawData as-is:', decodeError);
      // Если декодирование не удалось, используем rawData как есть
    }
    
    // rawData содержит XML строку, нужно распарсить
    return parseYandexSearchResults(xmlData, maxResults);
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
  // Формат Яндекс.Поиска может быть разным:
  // 1. <doc><url>...</url><title>...</title><passage>...</passage></doc>
  // 2. <group><doc>...</doc></group>
  // 3. Прямо в <response>
  
  // Сначала пробуем найти <doc> теги (могут быть внутри <group> или напрямую)
  // Теги <doc> могут иметь атрибуты: <doc id="..." touchdown="...">
  // Используем более гибкое регулярное выражение, которое учитывает атрибуты
  let docMatches: RegExpMatchArray | null = rawData.match(/<doc[^>]*>[\s\S]*?<\/doc>/g);
  
  // Если не нашли, пробуем найти внутри <group>
  if (!docMatches || docMatches.length === 0) {
    const groupMatches = rawData.match(/<group>[\s\S]*?<\/group>/g);
    if (groupMatches) {
      console.log('[YANDEX_SEARCH] Found', groupMatches.length, 'groups, extracting docs from groups...');
      const allDocs: string[] = [];
      for (const groupXml of groupMatches) {
        // Ищем <doc> с атрибутами внутри группы
        const groupDocMatches = groupXml.match(/<doc[^>]*>[\s\S]*?<\/doc>/g);
        if (groupDocMatches) {
          allDocs.push(...groupDocMatches);
        }
      }
      if (allDocs.length > 0) {
        docMatches = allDocs as RegExpMatchArray;
        console.log('[YANDEX_SEARCH] Extracted', docMatches.length, 'documents from groups');
      }
    }
  }
  
  if (docMatches && docMatches.length > 0) {
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
    // Пробуем найти количество результатов
    const foundMatch = rawData.match(/<found[^>]*>(\d+)<\/found>/);
    if (foundMatch) {
      console.log('[YANDEX_SEARCH] Found', foundMatch[1], 'results in XML, but no <doc> tags');
    }
    // Выводим больше XML для диагностики
    console.log('[YANDEX_SEARCH] First 1000 chars of XML:', rawData.substring(0, 1000));
    // Пробуем найти любые теги с URL
    const urlMatches = rawData.match(/<url>([\s\S]*?)<\/url>/g);
    if (urlMatches) {
      console.log('[YANDEX_SEARCH] Found', urlMatches.length, 'URL tags outside <doc> tags');
    }
  }

  console.log('[YANDEX_SEARCH] Parsed results:', results.length);
  return results;
}
