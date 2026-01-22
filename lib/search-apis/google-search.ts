/**
 * Интеграция с Google Custom Search API
 */

import { SearchResult, getSourceType } from '../source-searcher';

export interface GoogleSearchOptions {
  apiKey: string;
  searchEngineId: string;
  maxResults?: number;
}

/**
 * Поиск через Google Custom Search API
 */
export async function searchWithGoogle(
  query: string,
  options: GoogleSearchOptions
): Promise<SearchResult[]> {
  const { apiKey, searchEngineId, maxResults = 10 } = options;

  try {
    // Логируем для диагностики (без полного ключа)
    console.log('[GOOGLE_SEARCH] API Key prefix:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
    console.log('[GOOGLE_SEARCH] Search Engine ID:', searchEngineId ? `${searchEngineId.substring(0, 10)}...` : 'NOT SET');
    console.log('[GOOGLE_SEARCH] Query:', query.substring(0, 50));
    
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', searchEngineId);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(Math.min(maxResults, 10))); // Google ограничивает до 10 за запрос

    console.log('[GOOGLE_SEARCH] Request URL (without key):', url.toString().replace(/key=[^&]+/, 'key=***'));
    
    console.log('[GOOGLE_SEARCH] Sending fetch request...');
    const fetchStartTime = Date.now();
    
    // Добавляем таймаут для fetch запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('[GOOGLE_SEARCH] Fetch timeout after 15 seconds');
      controller.abort();
    }, 15000); // 15 секунд таймаут
    
    let response;
    try {
      console.log('[GOOGLE_SEARCH] Fetch call started at', new Date().toISOString());
      response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'FindOrigin-Bot/1.0',
        },
      });
      clearTimeout(timeoutId);
      console.log('[GOOGLE_SEARCH] Fetch call completed at', new Date().toISOString());
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const fetchDuration = Date.now() - fetchStartTime;
      console.error('[GOOGLE_SEARCH] Fetch failed after', fetchDuration, 'ms');
      console.error('[GOOGLE_SEARCH] Fetch error name:', fetchError?.name);
      console.error('[GOOGLE_SEARCH] Fetch error message:', fetchError?.message);
      console.error('[GOOGLE_SEARCH] Fetch error code:', fetchError?.code);
      if (fetchError?.cause) {
        console.error('[GOOGLE_SEARCH] Fetch error cause:', fetchError.cause);
      }
      throw new Error(`Google Search API fetch error: ${fetchError?.message || 'Unknown error'}`);
    }
    
    const fetchDuration = Date.now() - fetchStartTime;
    console.log('[GOOGLE_SEARCH] Fetch completed in', fetchDuration, 'ms');
    
    console.log('[GOOGLE_SEARCH] Fetch completed in', fetchDuration, 'ms');
    console.log('[GOOGLE_SEARCH] Response status:', response.status);
    console.log('[GOOGLE_SEARCH] Response ok:', response.ok);
    console.log('[GOOGLE_SEARCH] Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GOOGLE_SEARCH] Error response text (first 500 chars):', errorText.substring(0, 500));
      let error;
      try {
        error = JSON.parse(errorText);
        console.error('[GOOGLE_SEARCH] Parsed error:', JSON.stringify(error, null, 2));
      } catch (parseError) {
        console.error('[GOOGLE_SEARCH] Failed to parse error as JSON:', parseError);
        error = { error: errorText || 'Unknown error' };
      }
      
      // Детальная информация об ошибке
      if (error.error) {
        console.error('[GOOGLE_SEARCH] Error code:', error.error.code);
        console.error('[GOOGLE_SEARCH] Error message:', error.error.message);
        console.error('[GOOGLE_SEARCH] Error status:', error.error.status);
        if (error.error.errors) {
          console.error('[GOOGLE_SEARCH] Error details:', JSON.stringify(error.error.errors, null, 2));
        }
      }
      
      throw new Error(`Google Search API error: ${JSON.stringify(error)}`);
    }
    
    console.log('[GOOGLE_SEARCH] Response OK, parsing JSON...');

    const data = await response.json();
    console.log('[GOOGLE_SEARCH] JSON parsed. Items count:', data.items?.length || 0);

    if (!data.items || data.items.length === 0) {
      console.log('[GOOGLE_SEARCH] No items in response');
      return [];
    }

    const results = data.items.map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet || '',
      sourceType: getSourceType(item.link),
    }));
    
    console.log('[GOOGLE_SEARCH] Mapped results:', results.length);
    return results;
  } catch (error) {
    console.error('Error searching with Google:', error);
    throw error;
  }
}

