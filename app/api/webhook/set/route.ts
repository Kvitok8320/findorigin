import { NextRequest, NextResponse } from 'next/server';
import { setWebhook } from '@/lib/telegram';

/**
 * Endpoint для установки webhook
 * POST /api/webhook/set
 * 
 * Использование:
 * POST /api/webhook/set
 * Body: { "url": "https://your-domain.vercel.app/api/telegram" }
 */
export async function POST(request: NextRequest) {
  try {
    const { url, secretToken } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const result = await setWebhook(url, secretToken);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error setting webhook:', error);
    return NextResponse.json(
      { 
        error: 'Failed to set webhook',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

