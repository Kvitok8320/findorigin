/**
 * Скрипт для установки webhook на Vercel
 * Запуск: npm run set-webhook
 * 
 * Или с параметрами:
 * VERCEL_URL=https://your-project.vercel.app npm run set-webhook
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Загружаем .env
const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const VERCEL_URL = process.env.VERCEL_URL || process.argv[2] || 'https://findorigin.vercel.app';

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не найден в .env');
  process.exit(1);
}

// Если VERCEL_URL не указан, используем значение по умолчанию
if (!VERCEL_URL || VERCEL_URL === 'undefined') {
  console.log('ℹ️  VERCEL_URL не указан, использую значение по умолчанию: https://findorigin.vercel.app');
  console.log('   Чтобы указать другой URL:');
  console.log('   VERCEL_URL=https://your-project.vercel.app npm run set-webhook');
  console.log('   или');
  console.log('   npm run set-webhook https://your-project.vercel.app\n');
}

const webhookUrl = `${VERCEL_URL}/api/telegram`;

async function setWebhook() {
  try {
    console.log('🔧 Устанавливаю webhook...\n');
    console.log(`   URL: ${webhookUrl}\n`);
    
    const webhookBody: { url: string; secret_token?: string } = {
      url: webhookUrl,
    };
    
    // Если WEBHOOK_SECRET установлен, добавляем его к webhook
    if (WEBHOOK_SECRET && WEBHOOK_SECRET !== 'your_webhook_secret_here') {
      webhookBody.secret_token = WEBHOOK_SECRET;
      console.log('   Использую WEBHOOK_SECRET для безопасности\n');
    } else if (WEBHOOK_SECRET === 'your_webhook_secret_here') {
      console.log('   ⚠️  WEBHOOK_SECRET установлен, но имеет значение по умолчанию.');
      console.log('   Рекомендуется закомментировать WEBHOOK_SECRET в .env или установить реальное значение.\n');
    }
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookBody),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('❌ Ошибка при установке webhook:');
      console.error(`   ${data.description}`);
      process.exit(1);
    }

    console.log('✅ Webhook успешно установлен!\n');

    // Проверяем webhook
    console.log('🔍 Проверяю webhook...\n');
    const infoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const info = await infoResponse.json();

    if (info.ok) {
      console.log('📋 Информация о webhook:');
      console.log(`   URL: ${info.result.url}`);
      console.log(`   Ожидает подтверждения: ${info.result.pending_update_count || 0} обновлений`);
      
      if (info.result.last_error_date) {
        const errorDate = new Date(info.result.last_error_date * 1000);
        console.log(`   ⚠️  Последняя ошибка: ${errorDate.toLocaleString()}`);
        console.log(`   Сообщение: ${info.result.last_error_message || 'неизвестно'}`);
      } else {
        console.log('   ✅ Ошибок нет');
      }
    }

    console.log('\n✅ Готово! Теперь отправьте сообщение боту в Telegram.');
    
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

setWebhook();

