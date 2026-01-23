import { NextRequest, NextResponse } from 'next/server';
import { parseUpdate } from '@/lib/message-parser';
import type { TelegramUpdate } from '@/lib/types';
import { sendMessage } from '@/lib/telegram';
import { extractTextFromTelegramPost, requestMessageForward, cleanText } from '@/lib/telegram-post-extractor';
import { searchSources } from '@/lib/source-searcher';
import { compareWithAI, selectTopSources } from '@/lib/ai-comparison';

/**
 * Webhook endpoint для получения updates от Telegram
 * POST /api/telegram
 * 
 * Runtime configuration для Vercel
 */
export const runtime = 'nodejs';
export const maxDuration = 30; // Максимальное время выполнения (секунды)

export async function POST(request: NextRequest) {
  console.log('[WEBHOOK] Received request');
  
  try {
    // Валидация webhook secret (если настроен)
    const webhookSecret = process.env.WEBHOOK_SECRET;
    // Игнорируем значение по умолчанию из env.example
    if (webhookSecret && webhookSecret !== 'your_webhook_secret_here') {
      const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (secretToken !== webhookSecret) {
        console.warn('[WEBHOOK] Invalid webhook secret token');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const update: TelegramUpdate = await request.json();
    console.log('[WEBHOOK] Update received:', update.update_id, update.message?.text?.substring(0, 50));
    
    // Валидация структуры update
    if (!update || typeof update.update_id !== 'number') {
      console.error('[WEBHOOK] Invalid update format');
      return NextResponse.json(
        { error: 'Invalid update format' },
        { status: 400 }
      );
    }
    
    // Обрабатываем update синхронно до отправки первых сообщений
    // Это гарантирует, что функция не будет прервана Vercel
    // После отправки первых сообщений возвращаем ответ и продолжаем обработку асинхронно
    
    // Парсим сообщение для получения chatId
    const parsed = parseUpdate(update);
    if (!parsed) {
      console.log('[WEBHOOK] No message in update, returning 200 OK');
      return NextResponse.json({ ok: true });
    }

    const { chatId, text, isLink, telegramLink } = parsed;
    console.log('[WEBHOOK] Parsed message:', { chatId, textLength: text.length, isLink });
    
    // Отправляем первое сообщение синхронно (до возврата ответа)
    try {
      console.log('[WEBHOOK] Sending initial message synchronously...');
      await sendMessage(chatId, '🔍 Анализирую запрос...');
      console.log('[WEBHOOK] Initial message sent');
    } catch (error: any) {
      console.error('[WEBHOOK] Failed to send initial message:', error.message);
      // Даже если не удалось отправить, возвращаем 200 OK
      // чтобы Telegram не повторял запрос
    }
    
    // Быстро обрабатываем текст и отправляем второе сообщение синхронно
    try {
      let textToAnalyze = text;
      
      // Если это ссылка на Telegram-пост, пока просто используем текст
      // (извлечение поста займет время, делаем асинхронно)
      
      if (!textToAnalyze || textToAnalyze.trim().length === 0) {
        await sendMessage(
          chatId,
          '❌ Не удалось получить текст для анализа. Пожалуйста, отправьте текст или ссылку на Telegram-пост.'
        );
        return NextResponse.json({ ok: true });
      }
      
      // Очистка текста
      const cleanedText = cleanText(textToAnalyze);
      
      // Определяем, какой поисковый API будет использоваться
      let searchProvider = 'поисковую систему';
      if (process.env.YANDEX_API_KEY) {
        searchProvider = 'Яндекс.Поиск';
      } else if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
        searchProvider = 'Google Search';
      } else if (process.env.BING_API_KEY) {
        searchProvider = 'Bing Search';
      } else if (process.env.SERPAPI_KEY) {
        searchProvider = 'SerpAPI';
      }
      
      // Отправляем второе сообщение синхронно
      console.log('[WEBHOOK] Sending second message synchronously...');
      await sendMessage(chatId, `🔎 Ищу возможные источники через ${searchProvider}...`);
      console.log('[WEBHOOK] Second message sent');
      
      // Проверяем, настроен ли поисковый API
      const hasSearchAPI = !!(
        process.env.YANDEX_API_KEY ||
        process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID ||
        process.env.BING_API_KEY ||
        process.env.SERPAPI_KEY
      );
      
      // Если поисковый API не настроен, отправляем финальное сообщение синхронно
      // Это гарантирует, что пользователь получит ответ
      if (!hasSearchAPI) {
        console.log('[WEBHOOK] No search API configured, sending error message synchronously...');
        await sendMessage(
          chatId,
          '❌ Не удалось найти источники. Возможно, требуется настройка поискового API.\n\n' +
          'Для работы функции поиска необходимо настроить один из следующих сервисов:\n' +
          '- Яндекс.Поиск API (рекомендуется для РФ, не требует карту)\n' +
          '- Google Custom Search API\n' +
          '- Bing Search API\n' +
          '- SerpAPI\n' +
          'или другой поисковый сервис.'
        );
        console.log('[WEBHOOK] Error message sent synchronously');
      }
      
    } catch (error: any) {
      console.error('[WEBHOOK] Error in synchronous processing:', error.message);
    }
    
    // Теперь возвращаем ответ и продолжаем обработку асинхронно
    const response = NextResponse.json({ ok: true });
    
    // Продолжаем обработку асинхронно (поиск источников и отправка результатов)
    // Используем queueMicrotask для более надежной асинхронной обработки на Vercel
    console.log('[WEBHOOK] Scheduling async processing...');
    queueMicrotask(() => {
      console.log('[WEBHOOK] Async processing started, calling processUpdate...');
      console.log('[WEBHOOK] Update object:', JSON.stringify(update).substring(0, 200));
      try {
        const processPromise = processUpdate(update);
        console.log('[WEBHOOK] processUpdate promise created');
        processPromise.catch((error) => {
          console.error('[WEBHOOK] Error in async update processing:', error);
          console.error('[WEBHOOK] Error message:', error instanceof Error ? error.message : String(error));
          console.error('[WEBHOOK] Error stack:', error instanceof Error ? error.stack : 'No stack');
          console.error('[WEBHOOK] Error name:', error instanceof Error ? error.name : typeof error);
        });
      } catch (syncError) {
        console.error('[WEBHOOK] Synchronous error calling processUpdate:', syncError);
        console.error('[WEBHOOK] Sync error message:', syncError instanceof Error ? syncError.message : String(syncError));
      }
    });
    
    console.log('[WEBHOOK] Returning 200 OK, processing will continue asynchronously');
    return response;
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    console.error('[WEBHOOK] Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Асинхронная обработка update от Telegram
 */
async function processUpdate(update: TelegramUpdate) {
  console.log('[PROCESS] Function called, starting update processing');
  console.log('[PROCESS] Update ID:', update?.update_id);
  console.log('[PROCESS] Update type:', update?.message ? 'message' : 'unknown');
  
  try {
    console.log('[PROCESS] Parsing message...');
    // Парсинг сообщения
    const parsed = parseUpdate(update);
    
    if (!parsed) {
      console.log('[PROCESS] No message in update');
      return;
    }

    const { chatId, text, isLink, telegramLink } = parsed;
    console.log('[PROCESS] Parsed message:', { chatId, textLength: text.length, isLink });

    // Проверка токена перед отправкой
    console.log('[PROCESS] Checking TELEGRAM_BOT_TOKEN...');
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.error('[PROCESS] TELEGRAM_BOT_TOKEN is not set!');
      return;
    }
    console.log('[PROCESS] TELEGRAM_BOT_TOKEN is set');

    // Первое сообщение уже отправлено синхронно в POST handler
    // Продолжаем обработку без дублирования
    console.log('[PROCESS] Continuing with text processing...');

    let textToAnalyze = text;
    console.log('[PROCESS] Initial textToAnalyze length:', textToAnalyze.length);

    // Если это ссылка на Telegram-пост, пытаемся извлечь текст
    if (isLink && telegramLink) {
      console.log('[PROCESS] Processing Telegram link...');
      const post = await extractTextFromTelegramPost(
        telegramLink.channel,
        telegramLink.messageId
      );

      if (post && post.text) {
        textToAnalyze = post.text;
        console.log('[PROCESS] Extracted text from post, length:', textToAnalyze.length);
      } else {
        console.log('[PROCESS] Failed to extract text from post, requesting forward');
        // Если не удалось извлечь, просим пользователя переслать сообщение
        await requestMessageForward(chatId);
        return;
      }
    }

    // Проверка на пустой текст
    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
      console.log('[PROCESS] Text is empty, sending error message');
      await sendMessage(
        chatId,
        '❌ Не удалось получить текст для анализа. Пожалуйста, отправьте текст или ссылку на Telegram-пост.'
      );
      return;
    }

    // Очистка текста
    console.log('[PROCESS] Cleaning text...');
    const cleanedText = cleanText(textToAnalyze);
    console.log('[PROCESS] Cleaned text length:', cleanedText.length);

    // Поиск источников по исходному тексту (без предварительного анализа)
    console.log('[PROCESS] Starting search with original text');
    
    const searchResults = await searchSources(cleanedText, {
      maxResults: 10,
      preferredTypes: ['official', 'news', 'research', 'blog'],
    });

    console.log('[PROCESS] Search completed. Results count:', searchResults.length);

    // Формирование ответа
    if (searchResults.length === 0) {
      // Проверяем, было ли уже отправлено сообщение об ошибке синхронно
      const hasSearchAPI = !!(
        process.env.YANDEX_API_KEY ||
        process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID ||
        process.env.BING_API_KEY ||
        process.env.SERPAPI_KEY
      );
      
      // Если поисковый API не настроен, сообщение уже отправлено синхронно
      if (!hasSearchAPI) {
        console.log('[PROCESS] No results found, but error message already sent synchronously');
        return;
      }
      
      // Если API настроен, но результатов нет - отправляем сообщение
      console.log('[PROCESS] No results found, sending error message');
      await sendMessage(
        chatId,
        '❌ Не удалось найти источники по вашему запросу. Попробуйте переформулировать запрос.'
      );
      console.log('[PROCESS] Error message sent, processing complete');
      return;
    }

    // Отправляем сообщение о начале AI сравнения
    console.log('[PROCESS] Sending AI comparison message...');
    await sendMessage(chatId, '🤖 Сравниваю источники с исходным текстом через AI...');
    console.log('[PROCESS] AI comparison message sent');

    // AI сравнение источников с исходным текстом
    console.log('[PROCESS] Starting AI comparison...');
    let topResults: Array<{ source: typeof searchResults[0]; relevanceScore: number; confidence: string; explanation: string }>;
    
    try {
      const comparisons = await compareWithAI(cleanedText, searchResults);
      const selected = selectTopSources(comparisons, 3);
      topResults = selected.map(c => ({
        source: c.source,
        relevanceScore: c.relevanceScore,
        confidence: c.confidence,
        explanation: c.explanation,
      }));
      console.log('[PROCESS] AI comparison completed. Top results:', topResults.length);
    } catch (aiError: any) {
      console.error('[PROCESS] AI comparison failed:', aiError.message);
      // Fallback: используем первые 3 результата без AI оценки
      topResults = searchResults.slice(0, 3).map(source => ({
        source,
        relevanceScore: 50,
        confidence: 'medium',
        explanation: 'AI сравнение недоступно',
      }));
      console.log('[PROCESS] Using fallback results without AI comparison');
    }

    // Формируем сообщение с результатами
    let responseText = '📚 Найденные источники:\n\n';
    console.log('[PROCESS] Building response text...');

    topResults.forEach((result, index) => {
      const typeEmoji = {
        official: '🏛️',
        news: '📰',
        blog: '✍️',
        research: '🔬',
        other: '🔗',
      }[result.source.sourceType] || '🔗';

      const confidenceEmoji = {
        high: '✅',
        medium: '⚠️',
        low: '❓',
      }[result.confidence as 'high' | 'medium' | 'low'] || '⚠️';

      responseText += `${index + 1}. ${typeEmoji} ${result.source.title}\n`;
      responseText += `   ${result.source.url}\n`;
      responseText += `   ${confidenceEmoji} Релевантность: ${result.relevanceScore}% (${result.confidence})\n`;
      if (result.explanation) {
        responseText += `   ${result.explanation.substring(0, 80)}...\n`;
      }
      if (result.source.snippet) {
        responseText += `   ${result.source.snippet.substring(0, 100)}...\n`;
      }
      responseText += '\n';
    });

    // Отправляем ответ (разбиваем на части, если слишком длинный)
    const maxLength = 4096; // Максимальная длина сообщения в Telegram
    console.log('[PROCESS] Response text length:', responseText.length);
    if (responseText.length > maxLength) {
      console.log('[PROCESS] Response too long, splitting into parts');
      const parts = responseText.match(new RegExp(`.{1,${maxLength - 100}}`, 'g')) || [];
      for (const part of parts) {
        await sendMessage(chatId, part);
      }
    } else {
      console.log('[PROCESS] Sending response message...');
      await sendMessage(chatId, responseText);
    }
    console.log('[PROCESS] Response sent successfully, processing complete');

  } catch (error) {
    console.error('[PROCESS] Error processing update:', error);
    console.error('[PROCESS] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[PROCESS] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[PROCESS] Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Пытаемся отправить сообщение об ошибке пользователю
    try {
      const parsed = parseUpdate(update);
      if (parsed && process.env.TELEGRAM_BOT_TOKEN) {
        console.log('[PROCESS] Attempting to send error message to chat:', parsed.chatId);
        await sendMessage(
          parsed.chatId,
          '❌ Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.'
        );
      } else {
        console.error('[PROCESS] Cannot send error message - no parsed message or token');
      }
    } catch (sendError) {
      console.error('[PROCESS] Error sending error message:', sendError);
    }
  }
}
