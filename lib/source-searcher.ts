/**
 * Поиск возможных источников информации
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceType: 'official' | 'news' | 'blog' | 'research' | 'other';
}

export interface SourceSearchOptions {
  maxResults?: number;
  preferredTypes?: Array<'official' | 'news' | 'blog' | 'research'>;
}

/**
 * Определение типа источника по домену
 */
export function getSourceType(url: string): 'official' | 'news' | 'blog' | 'research' | 'other' {
  const domain = new URL(url).hostname.toLowerCase();

  // Официальные сайты
  if (domain.endsWith('.gov') || domain.endsWith('.gov.ru') || 
      domain.endsWith('.edu') || domain.endsWith('.edu.ru') ||
      domain.includes('official') || domain.includes('gov')) {
    return 'official';
  }

  // Новостные сайты
  const newsDomains = [
    'bbc.com', 'cnn.com', 'reuters.com', 'ap.org',
    'rbc.ru', 'ria.ru', 'tass.ru', 'interfax.ru',
    'lenta.ru', 'gazeta.ru', 'kommersant.ru', 'vedomosti.ru',
    'rt.com', 'sputniknews.com',
  ];
  if (newsDomains.some(nd => domain.includes(nd))) {
    return 'news';
  }

  // Исследования и научные публикации
  if (domain.includes('pubmed') || domain.includes('arxiv') ||
      domain.includes('researchgate') || domain.includes('scholar') ||
      domain.endsWith('.edu') || domain.includes('university')) {
    return 'research';
  }

  // Блоги (Medium, Habr, и т.д.)
  if (domain.includes('medium.com') || domain.includes('habr.com') ||
      domain.includes('blog') || domain.includes('wordpress')) {
    return 'blog';
  }

  return 'other';
}

/**
 * Фильтрация результатов по типам источников
 */
export function filterBySourceType(
  results: SearchResult[],
  preferredTypes?: Array<'official' | 'news' | 'blog' | 'research'>
): SearchResult[] {
  if (!preferredTypes || preferredTypes.length === 0) {
    return results;
  }

  // Сначала показываем предпочитаемые типы, затем остальные
  const preferred = results.filter(r => 
    preferredTypes.includes(r.sourceType as 'official' | 'news' | 'blog' | 'research')
  );
  const others = results.filter(r => 
    !preferredTypes.includes(r.sourceType as 'official' | 'news' | 'blog' | 'research')
  );

  return [...preferred, ...others];
}

/**
 * Поиск источников через поисковую систему
 * 
 * Поддерживает несколько поисковых API:
 * - Яндекс.Поиск API (рекомендуется для РФ)
 * - Google Custom Search API
 * - Bing Search API
 * - SerpAPI
 */
export async function searchSources(
  query: string,
  options: SourceSearchOptions = {}
): Promise<SearchResult[]> {
  const { maxResults = 10 } = options;

  // Попытка использовать Google Custom Search API
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  console.log('[SEARCH] Checking Google API:', {
    hasApiKey: !!googleApiKey,
    hasSearchEngineId: !!googleSearchEngineId,
    apiKeyLength: googleApiKey?.length || 0,
    searchEngineIdLength: googleSearchEngineId?.length || 0,
  });
  
  if (googleApiKey && googleSearchEngineId) {
    try {
      console.log('[SEARCH] Attempting Google search...');
      const { searchWithGoogle } = await import('./search-apis/google-search');
      const results = await Promise.race([
        searchWithGoogle(query, {
          apiKey: googleApiKey,
          searchEngineId: googleSearchEngineId,
          maxResults,
        }),
        new Promise<SearchResult[]>((_, reject) => 
          setTimeout(() => reject(new Error('Google search timeout after 20 seconds')), 20000)
        ),
      ]);
      console.log('[SEARCH] Google search completed successfully');
      return results;
    } catch (error: any) {
      console.error('[SEARCH] Google Search API error:', error?.message || error);
      console.error('[SEARCH] Error type:', error?.name || typeof error);
      // Продолжаем попытки с другими API
    }
  } else {
    console.log('[SEARCH] Google API not configured:', {
      missingApiKey: !googleApiKey,
      missingSearchEngineId: !googleSearchEngineId,
    });
  }

  // Попытка использовать Яндекс.Поиск API (приоритет для РФ)
  const yandexApiKey = process.env.YANDEX_API_KEY;
  
  if (yandexApiKey) {
    try {
      console.log('[SEARCH] Attempting Yandex search...');
      const { searchWithYandex } = await import('./search-apis/yandex-search');
      const results = await searchWithYandex(query, {
        apiKey: yandexApiKey,
        maxResults,
      });
      console.log('[SEARCH] Yandex search completed successfully');
      return results;
    } catch (error: any) {
      console.error('[SEARCH] Yandex Search API error:', error?.message || error);
      // Продолжаем попытки с другими API
    }
  }

  // Попытка использовать Bing Search API
  const bingApiKey = process.env.BING_API_KEY;
  
  if (bingApiKey) {
    try {
      console.log('[SEARCH] Attempting Bing search...');
      const { searchWithBing } = await import('./search-apis/bing-search');
      const results = await searchWithBing(query, {
        apiKey: bingApiKey,
        maxResults,
      });
      console.log('[SEARCH] Bing search completed successfully');
      return results;
    } catch (error: any) {
      console.error('[SEARCH] Bing Search API error:', error?.message || error);
      // Продолжаем попытки с другими API
    }
  }

  // Попытка использовать SerpAPI
  const serpApiKey = process.env.SERPAPI_KEY;
  
  if (serpApiKey) {
    try {
      const { searchWithSerpAPI } = await import('./search-apis/serpapi-search');
      return await searchWithSerpAPI(query, {
        apiKey: serpApiKey,
        maxResults,
      });
    } catch (error) {
      console.error('SerpAPI error:', error);
    }
  }

  // Если ни один API не настроен, возвращаем пустой массив
  console.log(`No search API configured. Searching for: ${query}`);
  return [];
}

/**
 * Поиск источников по нескольким запросам
 */
export async function searchMultipleQueries(
  queries: string[],
  options: SourceSearchOptions = {}
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];

  for (const query of queries) {
    const results = await searchSources(query, options);
    allResults.push(...results);
  }

  // Удаляем дубликаты по URL
  const uniqueResults = Array.from(
    new Map(allResults.map(r => [r.url, r])).values()
  );

  // Фильтруем по типам источников
  const filtered = options.preferredTypes 
    ? filterBySourceType(uniqueResults, options.preferredTypes)
    : uniqueResults;

  // Ограничиваем количество результатов
  return filtered.slice(0, options.maxResults || 20);
}

