/**
 * Скрипт для диагностики проблем с ботом
 * Запуск: npm run diagnose-bot
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Загружаем .env.local
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const VERCEL_URL = process.env.VERCEL_URL || 'https://findorigin.vercel.app';

interface DiagnosticResult {
  name: string;
  status: 'ok' | 'error' | 'warning';
  message: string;
}

const results: DiagnosticResult[] = [];

async function checkToken() {
  console.log('🔍 Проверка токена...');
  
  if (!BOT_TOKEN) {
    results.push({
      name: 'Токен бота',
      status: 'error',
      message: 'TELEGRAM_BOT_TOKEN не найден в .env.local'
    });
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      results.push({
        name: 'Токен бота',
        status: 'ok',
        message: `✅ Токен валиден. Бот: @${data.result.username || 'неизвестно'}`
      });
    } else {
      results.push({
        name: 'Токен бота',
        status: 'error',
        message: `❌ Ошибка: ${data.description}`
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Токен бота',
      status: 'error',
      message: `❌ Ошибка подключения: ${error.message}`
    });
  }
}

async function checkWebhook() {
  console.log('🔍 Проверка webhook...');
  
  if (!BOT_TOKEN) {
    results.push({
      name: 'Webhook',
      status: 'error',
      message: 'Не могу проверить - токен не найден'
    });
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const data = await response.json();
    
    if (!data.ok) {
      results.push({
        name: 'Webhook',
        status: 'error',
        message: `❌ Ошибка: ${data.description}`
      });
      return;
    }

    const info = data.result;
    const expectedUrl = `${VERCEL_URL}/api/telegram`;

    if (!info.url) {
      results.push({
        name: 'Webhook',
        status: 'error',
        message: '❌ Webhook не установлен. Используйте: npm run set-webhook'
      });
    } else if (info.url !== expectedUrl) {
      results.push({
        name: 'Webhook',
        status: 'warning',
        message: `⚠️  Webhook установлен на другой URL: ${info.url}\n   Ожидается: ${expectedUrl}`
      });
    } else {
      let message = `✅ Webhook установлен правильно: ${info.url}`;
      
      if (info.pending_update_count > 0) {
        message += `\n   ⚠️  Ожидает подтверждения: ${info.pending_update_count} обновлений`;
      }
      
      if (info.last_error_date) {
        const errorDate = new Date(info.last_error_date * 1000);
        message += `\n   ❌ Последняя ошибка: ${errorDate.toLocaleString()}`;
        message += `\n   ${info.last_error_message || 'неизвестно'}`;
      }
      
      results.push({
        name: 'Webhook',
        status: info.last_error_date ? 'warning' : 'ok',
        message
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Webhook',
      status: 'error',
      message: `❌ Ошибка подключения: ${error.message}`
    });
  }
}

async function checkHealthEndpoint() {
  console.log('🔍 Проверка /api/health...');
  
  try {
    const response = await fetch(`${VERCEL_URL}/api/health`);
    const data = await response.json();
    
    if (data.status === 'ok' && data.hasTelegramToken) {
      results.push({
        name: 'Health endpoint',
        status: 'ok',
        message: `✅ Endpoint доступен. Токен настроен: ${data.hasTelegramToken}`
      });
    } else if (data.status === 'ok' && !data.hasTelegramToken) {
      results.push({
        name: 'Health endpoint',
        status: 'error',
        message: '❌ Endpoint доступен, но TELEGRAM_BOT_TOKEN не настроен на Vercel!'
      });
    } else {
      results.push({
        name: 'Health endpoint',
        status: 'warning',
        message: `⚠️  Endpoint вернул: ${JSON.stringify(data)}`
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Health endpoint',
      status: 'error',
      message: `❌ Не удалось подключиться: ${error.message}`
    });
  }
}

async function checkTelegramEndpoint() {
  console.log('🔍 Проверка /api/telegram...');
  
  try {
    // Пытаемся сделать GET запрос (должен вернуть ошибку, но не 404)
    const response = await fetch(`${VERCEL_URL}/api/telegram`, {
      method: 'GET'
    });
    
    if (response.status === 404) {
      results.push({
        name: 'Telegram endpoint',
        status: 'error',
        message: '❌ Endpoint /api/telegram не найден (404)'
      });
    } else if (response.status === 405) {
      results.push({
        name: 'Telegram endpoint',
        status: 'ok',
        message: '✅ Endpoint доступен (405 - это нормально для GET запроса)'
      });
    } else {
      results.push({
        name: 'Telegram endpoint',
        status: 'warning',
        message: `⚠️  Endpoint вернул статус: ${response.status}`
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Telegram endpoint',
      status: 'error',
      message: `❌ Не удалось подключиться: ${error.message}`
    });
  }
}

async function runDiagnostics() {
  console.log('🔧 Диагностика бота FindOrigin\n');
  console.log(`📍 Vercel URL: ${VERCEL_URL}\n`);
  console.log('─'.repeat(50) + '\n');

  await checkToken();
  await checkWebhook();
  await checkHealthEndpoint();
  await checkTelegramEndpoint();

  console.log('\n' + '─'.repeat(50));
  console.log('📊 Результаты диагностики:\n');

  results.forEach((result, index) => {
    const icon = result.status === 'ok' ? '✅' : result.status === 'error' ? '❌' : '⚠️';
    console.log(`${index + 1}. ${icon} ${result.name}`);
    console.log(`   ${result.message.split('\n').join('\n   ')}\n`);
  });

  const errors = results.filter(r => r.status === 'error');
  const warnings = results.filter(r => r.status === 'warning');

  console.log('─'.repeat(50));
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ Все проверки пройдены! Бот должен работать.');
    console.log('\n💡 Если бот всё ещё не отвечает:');
    console.log('   1. Проверьте логи на Vercel (Deployments → Functions → /api/telegram)');
    console.log('   2. Убедитесь, что отправляете сообщение правильному боту');
    console.log('   3. Подождите несколько минут и попробуйте снова');
  } else if (errors.length > 0) {
    console.log(`\n❌ Найдено ${errors.length} критических проблем. Исправьте их для работы бота.`);
  } else {
    console.log(`\n⚠️  Найдено ${warnings.length} предупреждений. Проверьте их.`);
  }

  console.log('\n📖 Подробная инструкция: см. BOT_NOT_RESPONDING.md\n');
}

runDiagnostics().catch(console.error);

