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
  try {
    const update: TelegramUpdate = await request.json();
    
    // Быстрый ответ 200 OK (обработка будет асинхронной)
    const response = NextResponse.json({ ok: true });
    
    // Асинхронная обработка update
    processUpdate(update).catch((error) => {
      console.error('Error in async update processing:', error);
    });
    
    return response;
  } catch (error) {
    console.error('Error processing webhook:', error);
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
  try {
    // Парсинг сообщения
    const parsed = parseUpdate(update);
    
    if (!parsed) {
      console.log('No message in update');
      return;
    }

    const { chatId, text, isLink, telegramLink } = parsed;

    // Отправляем сообщение о начале обработки
    await sendMessage(chatId, '🔍 Анализирую запрос...');

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
    console.error('Error processing update:', error);
    
    // Пытаемся отправить сообщение об ошибке пользователю
    try {
      const parsed = parseUpdate(update);
      if (parsed) {
        await sendMessage(
          parsed.chatId,
          '❌ Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.'
        );
      }
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
  }
}
