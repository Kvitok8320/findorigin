import { NextRequest, NextResponse } from 'next/server';
import { cleanText } from '@/lib/telegram-post-extractor';
import { analyzeText } from '@/lib/text-analyzer';
import { searchMultipleQueries } from '@/lib/source-searcher';

/**
 * Тестовый endpoint для проверки функциональности без Telegram
 * POST /api/test-analyze
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Очистка текста
    const cleanedText = cleanText(text);

    // Анализ текста
    const analyzedData = analyzeText(cleanedText);

    // Поиск источников (может вернуть пустой массив, если API не настроен)
    const searchResults = await searchMultipleQueries(analyzedData.searchQueries, {
      maxResults: 10,
      preferredTypes: ['official', 'news', 'research', 'blog'],
    });

    return NextResponse.json({
      originalText: text,
      cleanedText,
      analysis: {
        keyClaims: analyzedData.keyClaims,
        dates: analyzedData.dates,
        numbers: analyzedData.numbers,
        names: analyzedData.names,
        links: analyzedData.links,
        searchQueries: analyzedData.searchQueries,
      },
      searchResults: searchResults.slice(0, 3),
      note: searchResults.length === 0 
        ? 'Поисковый API не настроен. Настройте один из API (Google, Bing, SerpAPI) для получения результатов поиска.'
        : null,
    });
  } catch (error: any) {
    console.error('Error in test-analyze:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

