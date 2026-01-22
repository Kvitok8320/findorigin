import { NextRequest, NextResponse } from 'next/server';
import { parseUpdate } from '@/lib/message-parser';
import type { TelegramUpdate } from '@/lib/types';
import { sendMessage } from '@/lib/telegram';
import { extractTextFromTelegramPost, requestMessageForward, cleanText } from '@/lib/telegram-post-extractor';
import { analyzeText } from '@/lib/text-analyzer';
import { searchMultipleQueries } from '@/lib/source-searcher';

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
    if (webhookSecret) {
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
      
      // Очистка и анализ текста
      const cleanedText = cleanText(textToAnalyze);
      const analyzedData = analyzeText(cleanedText);
      
      // Отправляем второе сообщение синхронно
      console.log('[WEBHOOK] Sending second message synchronously...');
      await sendMessage(chatId, '🔎 Ищу возможные источники...');
      console.log('[WEBHOOK] Second message sent');
      
    } catch (error: any) {
      console.error('[WEBHOOK] Error in synchronous processing:', error.message);
    }
    
    // Теперь возвращаем ответ и продолжаем обработку асинхронно
    const response = NextResponse.json({ ok: true });
    
    // Продолжаем обработку асинхронно (поиск источников и отправка результатов)
    setTimeout(() => {
      processUpdate(update).catch((error) => {
        console.error('[WEBHOOK] Error in async update processing:', error);
        console.error('[WEBHOOK] Error stack:', error instanceof Error ? error.stack : 'No stack');
      });
    }, 0);
    
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
  console.log('[PROCESS] Starting update processing');
  console.log('[PROCESS] Update ID:', update.update_id);
  
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

    let textToAnalyze = text;

    // Если это ссылка на Telegram-пост, пытаемся извлечь текст
    if (isLink && telegramLink) {
      const post = await extractTextFromTelegramPost(
        telegramLink.channel,
        telegramLink.messageId
      );

      if (post && post.text) {
        textToAnalyze = post.text;
      } else {
        // Если не удалось извлечь, просим пользователя переслать сообщение
        await requestMessageForward(chatId);
        return;
      }
    }

    // Проверка на пустой текст
    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
      await sendMessage(
        chatId,
        '❌ Не удалось получить текст для анализа. Пожалуйста, отправьте текст или ссылку на Telegram-пост.'
      );
      return;
    }

    // Очистка текста
    const cleanedText = cleanText(textToAnalyze);

    // Анализ текста
    const analyzedData = analyzeText(cleanedText);

    // Поиск источников
    await sendMessage(chatId, '🔎 Ищу возможные источники...');
    console.log('[PROCESS] Starting search with queries:', analyzedData.searchQueries);

    const searchResults = await searchMultipleQueries(analyzedData.searchQueries, {
      maxResults: 10,
      preferredTypes: ['official', 'news', 'research', 'blog'],
    });

    console.log('[PROCESS] Search completed. Results count:', searchResults.length);

    // Формирование ответа
    if (searchResults.length === 0) {
      console.log('[PROCESS] No results found, sending error message');
      await sendMessage(
        chatId,
        '❌ Не удалось найти источники. Возможно, требуется настройка поискового API.\n\n' +
        'Для работы функции поиска необходимо настроить один из следующих сервисов:\n' +
        '- Google Custom Search API\n' +
        '- Bing Search API\n' +
        '- SerpAPI\n' +
        'или другой поисковый сервис.'
      );
      console.log('[PROCESS] Error message sent, processing complete');
      return;
    }

    // Выбираем топ-3 результата
    const topResults = searchResults.slice(0, 3);
    console.log('[PROCESS] Selected top results:', topResults.length);

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
      }[result.sourceType] || '🔗';

      responseText += `${index + 1}. ${typeEmoji} ${result.title}\n`;
      responseText += `   ${result.url}\n`;
      if (result.snippet) {
        responseText += `   ${result.snippet.substring(0, 100)}...\n`;
      }
      responseText += '\n';
    });

    // Добавляем информацию об анализе
    if (analyzedData.keyClaims.length > 0) {
      responseText += '\n📌 Ключевые утверждения:\n';
      analyzedData.keyClaims.slice(0, 2).forEach((claim, i) => {
        responseText += `${i + 1}. ${claim.substring(0, 80)}...\n`;
      });
    }

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
