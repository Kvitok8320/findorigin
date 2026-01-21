/**
 * Интеграция с Bing Search API
 */

import { SearchResult, getSourceType } from '../source-searcher';

export interface BingSearchOptions {
  apiKey: string;
  maxResults?: number;
}

/**
 * Поиск через Bing Search API
 */
export async function searchWithBing(
  query: string,
  options: BingSearchOptions
): Promise<SearchResult[]> {
  const { apiKey, maxResults = 10 } = options;

  try {
    const url = new URL('https://api.bing.microsoft.com/v7.0/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(Math.min(maxResults, 50)));

    const response = await fetch(url.toString(), {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Bing Search API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();

    if (!data.webPages || !data.webPages.value || data.webPages.value.length === 0) {
      return [];
    }

    return data.webPages.value.map((item: any) => ({
      title: item.name,
      url: item.url,
      snippet: item.snippet || '',
      sourceType: getSourceType(item.url),
    }));
  } catch (error) {
    console.error('Error searching with Bing:', error);
    throw error;
  }
}

