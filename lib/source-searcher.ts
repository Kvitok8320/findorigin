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
  const preferred = results.filter(r => preferredTypes.includes(r.sourceType));
  const others = results.filter(r => !preferredTypes.includes(r.sourceType));

  return [...preferred, ...others];
}

/**
 * Поиск источников через поисковую систему
 * 
 * Примечание: Для работы требуется API ключ от поисковой системы
 * Здесь реализована базовая структура. В продакшене нужно использовать:
 * - Google Custom Search API
 * - Bing Search API
 * - SerpAPI
 * - или другие сервисы
 */
export async function searchSources(
  query: string,
  options: SourceSearchOptions = {}
): Promise<SearchResult[]> {
  const { maxResults = 10, preferredTypes } = options;

  // TODO: Интеграция с реальным поисковым API
  // Пример для Google Custom Search API:
  /*
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`
  );
  
  const data = await response.json();
  const results = data.items?.map((item: any) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet,
    sourceType: getSourceType(item.link),
  })) || [];
  */

  // Временная заглушка для разработки
  console.log(`Searching for: ${query}`);
  
  // Возвращаем пустой массив, так как требуется настройка API
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

