'use client';

import { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Симулируем отправку сообщения боту
      // В реальном использовании это делается через Telegram
      const response = await fetch('/api/test-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при анализе текста');
      }

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">FindOrigin Bot</h1>
          <p className="text-lg text-gray-600 mb-2">
            Telegram bot для поиска источников информации
          </p>
          <p className="text-sm text-gray-500">
            Эта страница для тестирования. Основное взаимодействие происходит через Telegram.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                Введите текст для анализа:
              </label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Введите текст или ссылку на Telegram-пост (например: t.me/channel/123)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Анализирую...' : 'Проанализировать'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">❌ {error}</p>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h3 className="font-semibold mb-2">Результат анализа:</h3>
              <pre className="text-xs overflow-auto max-h-96 bg-white p-3 rounded border">
                {result}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="mb-2">
            <strong>Как использовать бота в Telegram:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
            <li>Создайте бота через @BotFather</li>
            <li>Получите токен бота</li>
            <li>Настройте переменные окружения</li>
            <li>Установите webhook</li>
            <li>Найдите вашего бота в Telegram и отправьте ему сообщение</li>
          </ol>
        </div>
      </div>
    </main>
  );
}

