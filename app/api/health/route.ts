import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check endpoint для проверки работы API
 * GET /api/health
 */
export async function GET(request: NextRequest) {
  const hasToken = !!process.env.TELEGRAM_BOT_TOKEN;
  
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasTelegramToken: hasToken,
    message: hasToken 
      ? 'Bot is configured correctly' 
      : 'TELEGRAM_BOT_TOKEN is not set in environment variables',
  });
}

