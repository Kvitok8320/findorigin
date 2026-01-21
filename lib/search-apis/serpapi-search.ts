/**
 * Интеграция с SerpAPI
 */

import { SearchResult, getSourceType } from '../source-searcher';

export interface SerpAPIOptions {
  apiKey: string;
  maxResults?: number;
}

/**
 * Поиск через SerpAPI
 */
export async function searchWithSerpAPI(
  query: string,
  options: SerpAPIOptions
): Promise<SearchResult[]> {
  const { apiKey, maxResults = 10 } = options;

  try {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('q', query);
    url.searchParams.set('engine', 'google');
    url.searchParams.set('num', String(Math.min(maxResults, 100)));

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`SerpAPI error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();

    if (!data.organic_results || data.organic_results.length === 0) {
      return [];
    }

    return data.organic_results.slice(0, maxResults).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet || '',
      sourceType: getSourceType(item.link),
    }));
  } catch (error) {
    console.error('Error searching with SerpAPI:', error);
    throw error;
  }
}

