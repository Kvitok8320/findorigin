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
 */
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
    
    // Быстрый ответ 200 OK (обработка будет асинхронной)
    const response = NextResponse.json({ ok: true });
    
    // Асинхронная обработка update
    processUpdate(update).catch((error) => {
      console.error('[WEBHOOK] Error in async update processing:', error);
      console.error('[WEBHOOK] Error stack:', error instanceof Error ? error.stack : 'No stack');
    });
    
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

    // Отправляем сообщение о начале обработки
    console.log('[PROCESS] Sending initial message to chat:', chatId);
    try {
      await sendMessage(chatId, '🔍 Анализирую запрос...');
      console.log('[PROCESS] Initial message sent successfully');
    } catch (sendError: any) {
      console.error('[PROCESS] Failed to send initial message:', sendError.message);
      console.error('[PROCESS] Send error details:', {
        name: sendError.name,
        code: sendError.code,
        cause: sendError.cause,
      });
      throw sendError;
    }

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

    const searchResults = await searchMultipleQueries(analyzedData.searchQueries, {
      maxResults: 10,
      preferredTypes: ['official', 'news', 'research', 'blog'],
    });

    // Формирование ответа
    if (searchResults.length === 0) {
      await sendMessage(
        chatId,
        '❌ Не удалось найти источники. Возможно, требуется настройка поискового API.\n\n' +
        'Для работы функции поиска необходимо настроить один из следующих сервисов:\n' +
        '- Google Custom Search API\n' +
        '- Bing Search API\n' +
        '- SerpAPI\n' +
        'или другой поисковый сервис.'
      );
      return;
    }

    // Выбираем топ-3 результата
    const topResults = searchResults.slice(0, 3);

    // Формируем сообщение с результатами
    let responseText = '📚 Найденные источники:\n\n';

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
    if (responseText.length > maxLength) {
      const parts = responseText.match(new RegExp(`.{1,${maxLength - 100}}`, 'g')) || [];
      for (const part of parts) {
        await sendMessage(chatId, part);
      }
    } else {
      await sendMessage(chatId, responseText);
    }

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
