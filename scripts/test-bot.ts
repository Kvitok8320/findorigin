/**
 * Скрипт для проверки работы бота
 * Запуск: npm run test-bot
 */

// Загружаем переменные окружения из .env.local ПЕРЕД импортом других модулей
import { config } from 'dotenv';
import { resolve } from 'path';

// Загружаем .env.local
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

// Проверяем, что токен загружен
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не найден в .env.local');
  console.error(`   Проверьте файл: ${envPath}`);
  console.error('   Убедитесь, что файл существует и содержит строку:');
  console.error('   TELEGRAM_BOT_TOKEN=ваш_токен');
  process.exit(1);
}

// Используем API напрямую, чтобы избежать проблем с импортом
const TELEGRAM_API_URL = process.env.TELEGRAM_API_URL || 'https://api.telegram.org/bot';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = `${TELEGRAM_API_URL}${BOT_TOKEN}`;

async function getMe() {
  const response = await fetch(`${API_BASE}/getMe`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Failed to get bot info: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function testBot() {
  try {
    console.log('🔍 Проверяю токен бота...\n');
    
    // Проверка информации о боте
    const botInfo = await getMe();
    console.log('✅ Токен валидный!');
    console.log('📋 Информация о боте:');
    console.log(`   Имя: ${botInfo.result.first_name}`);
    console.log(`   Username: @${botInfo.result.username}`);
    console.log(`   ID: ${botInfo.result.id}`);
    console.log(`   Может присоединяться к группам: ${botInfo.result.can_join_groups ? 'Да' : 'Нет'}`);
    console.log(`   Может читать сообщения в группах: ${botInfo.result.can_read_all_group_messages ? 'Да' : 'Нет'}`);
    console.log(`   Поддерживает inline-запросы: ${botInfo.result.supports_inline_queries ? 'Да' : 'Нет'}\n`);
    
    console.log('✅ Бот готов к работе!\n');
    console.log('📝 Следующие шаги:');
    console.log('   1. Настройте webhook (см. SETUP.md)');
    console.log('   2. Найдите бота в Telegram: @' + botInfo.result.username);
    console.log('   3. Отправьте боту сообщение\n');
    
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    console.error('\n💡 Проверьте:');
    console.error('   - Правильно ли указан TELEGRAM_BOT_TOKEN в .env.local');
    console.error('   - Не содержит ли токен лишних пробелов');
    console.error('   - Действителен ли токен (не был ли отозван)');
    process.exit(1);
  }
}

testBot();
