/**
 * Скрипт для проверки webhook
 * Запуск: npm run check-webhook
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Загружаем .env.local
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не найден в .env.local');
  process.exit(1);
}

async function checkWebhook() {
  try {
    console.log('🔍 Проверяю webhook...\n');
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const data = await response.json();
    
    if (!data.ok) {
      console.error('❌ Ошибка:', data.description);
      return;
    }
    
    const info = data.result;
    
    console.log('📋 Информация о webhook:');
    console.log(`   URL: ${info.url || 'не установлен'}`);
    console.log(`   Ожидает подтверждения: ${info.pending_update_count || 0} обновлений`);
    
    if (info.last_error_date) {
      const errorDate = new Date(info.last_error_date * 1000);
      console.log(`   ❌ Последняя ошибка: ${errorDate.toLocaleString()}`);
      console.log(`   Сообщение: ${info.last_error_message || 'неизвестно'}`);
    }
    
    if (info.url) {
      console.log('\n✅ Webhook установлен');
      console.log(`   Проверьте доступность: ${info.url}`);
    } else {
      console.log('\n⚠️  Webhook не установлен');
      console.log('   Установите webhook командой:');
      console.log(`   curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \\`);
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"url": "https://YOUR_VERCEL_URL.vercel.app/api/telegram"}\'');
    }
    
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkWebhook();

