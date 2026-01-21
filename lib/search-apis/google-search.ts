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
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', searchEngineId);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(Math.min(maxResults, 10))); // Google ограничивает до 10 за запрос

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Google Search API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet || '',
      sourceType: getSourceType(item.link),
    }));
  } catch (error) {
    console.error('Error searching with Google:', error);
    throw error;
  }
}

