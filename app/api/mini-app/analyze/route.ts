import { NextRequest, NextResponse } from 'next/server';
import { searchSources } from '@/lib/source-searcher';
import { compareWithAI, selectTopSources } from '@/lib/ai-comparison';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, initData } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    console.log('[MINI_APP] Received analyze request, text length:', text.length);

    // Очистка текста
    const cleanedText = text.trim();

    // Поиск источников
    console.log('[MINI_APP] Starting search...');
    const searchResults = await searchSources(cleanedText, { maxResults: 10 });

    if (searchResults.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'Источники не найдены',
      });
    }

    console.log('[MINI_APP] Search completed, found', searchResults.length, 'results');

    // AI сравнение
    let topResults;
    try {
      console.log('[MINI_APP] Starting AI comparison...');
      const comparisons = await compareWithAI(cleanedText, searchResults);
      topResults = selectTopSources(comparisons, 3);
      console.log('[MINI_APP] AI comparison completed, top results:', topResults.length);
    } catch (aiError: any) {
      console.error('[MINI_APP] AI comparison failed:', aiError.message);
      // Fallback: возвращаем первые 3 результата без AI оценки
      topResults = searchResults.slice(0, 3).map(source => ({
        source,
        relevanceScore: 50,
        confidence: 'medium' as const,
        explanation: 'AI сравнение недоступно',
      }));
    }

    // Форматируем результаты для TMA
    const formattedResults = topResults.map(result => ({
      title: result.source.title,
      url: result.source.url,
      snippet: result.source.snippet || '',
      relevanceScore: result.relevanceScore,
      confidence: result.confidence,
      explanation: result.explanation,
      sourceType: result.source.sourceType,
    }));

    return NextResponse.json({
      results: formattedResults,
      count: formattedResults.length,
    });

  } catch (error: any) {
    console.error('[MINI_APP] Error processing request:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

