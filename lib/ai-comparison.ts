/**
 * AI сравнение источников с исходным текстом
 * Использует OpenAI GPT-4o-mini для семантического сравнения
 */

import { SearchResult } from './source-searcher';

export interface ComparisonResult {
  source: SearchResult;
  relevanceScore: number; // 0-100
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
}

/**
 * Сравнение исходного текста с найденными источниками через OpenAI
 */
export async function compareWithAI(
  originalText: string,
  sources: SearchResult[]
): Promise<ComparisonResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('[AI] OPENAI_API_KEY is not set');
    throw new Error('OpenAI API key is not configured');
  }

  if (sources.length === 0) {
    return [];
  }

  try {
    console.log('[AI] Starting comparison with', sources.length, 'sources');
    
    // Формируем промпт для сравнения
    const prompt = buildComparisonPrompt(originalText, sources);
    
    console.log('[AI] Sending request to OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert fact-checker. Compare the original text with search results and evaluate their relevance. Return JSON format only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[AI] OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log('[AI] Received response from OpenAI');
    
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const comparison = JSON.parse(content);
    console.log('[AI] Parsed comparison results');

    // Преобразуем ответ AI в формат ComparisonResult
    return formatComparisonResults(sources, comparison);

  } catch (error) {
    console.error('[AI] Error in AI comparison:', error);
    throw error;
  }
}

/**
 * Формирование промпта для сравнения
 */
function buildComparisonPrompt(originalText: string, sources: SearchResult[]): string {
  const sourcesText = sources.map((source, index) => {
    return `
${index + 1}. Title: ${source.title}
   URL: ${source.url}
   Snippet: ${source.snippet}
   Type: ${source.sourceType}`;
  }).join('\n');

  return `Compare the original text with the following search results and evaluate their relevance.

Original text:
"${originalText}"

Search results:
${sourcesText}

For each source, provide:
- relevanceScore: number from 0 to 100 (how relevant is this source to the original text)
- confidence: "high", "medium", or "low" (how confident you are in this assessment)
- explanation: brief explanation in Russian (why this source is relevant or not)

Return JSON in this format:
{
  "results": [
    {
      "index": 1,
      "relevanceScore": 85,
      "confidence": "high",
      "explanation": "Источник подтверждает основное утверждение..."
    },
    ...
  ]
}`;
}

/**
 * Форматирование результатов сравнения
 */
function formatComparisonResults(
  sources: SearchResult[],
  aiResponse: any
): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  if (!aiResponse.results || !Array.isArray(aiResponse.results)) {
    console.warn('[AI] Invalid AI response format, using fallback');
    // Fallback: возвращаем все источники с базовыми оценками
    return sources.map(source => ({
      source,
      relevanceScore: 50,
      confidence: 'medium' as const,
      explanation: 'Не удалось оценить релевантность',
    }));
  }

  for (const aiResult of aiResponse.results) {
    const index = aiResult.index - 1; // AI использует 1-based индексы
    if (index >= 0 && index < sources.length) {
      results.push({
        source: sources[index],
        relevanceScore: Math.min(100, Math.max(0, aiResult.relevanceScore || 50)),
        confidence: aiResult.confidence || 'medium',
        explanation: aiResult.explanation || 'Оценка релевантности',
      });
    }
  }

  // Сортируем по релевантности (от большего к меньшему)
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return results;
}

/**
 * Выбор топ-3 наиболее релевантных источников
 */
export function selectTopSources(comparisons: ComparisonResult[], limit: number = 3): ComparisonResult[] {
  return comparisons
    .filter(c => c.relevanceScore > 30) // Фильтруем источники с низкой релевантностью
    .slice(0, limit);
}

