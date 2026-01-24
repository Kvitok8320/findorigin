'use client';

import { useEffect, useState, useCallback } from 'react';

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat?: {
      id: number;
      type: string;
    };
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevanceScore: number;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  sourceType: 'official' | 'news' | 'blog' | 'research' | 'other';
}

export default function MiniAppPage() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    console.log('[TMA] handleAnalyze called, text length:', text.trim().length, 'isLoading:', isLoading);
    
    if (!text.trim() || isLoading) {
      console.log('[TMA] Skipping - no text or already loading');
      return;
    }

    console.log('[TMA] Starting analysis...');
    setIsLoading(true);
    setError(null);
    setResults([]);
    
    if (webApp) {
      webApp.MainButton.showProgress();
      webApp.HapticFeedback.impactOccurred('light');
    }

    try {
      console.log('[TMA] Sending request to /api/mini-app/analyze');
      const response = await fetch('/api/mini-app/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          initData: webApp?.initData,
        }),
      });

      console.log('[TMA] Response status:', response.status, 'ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[TMA] Error response:', errorData);
        throw new Error(errorData.error || 'Failed to analyze text');
      }

      const data = await response.json();
      console.log('[TMA] Received data:', data);
      
      if (data.results && data.results.length > 0) {
        setResults(data.results);
        if (webApp) {
          webApp.HapticFeedback.notificationOccurred('success');
        }
      } else {
        setError('Источники не найдены');
        if (webApp) {
          webApp.HapticFeedback.notificationOccurred('warning');
        }
      }
    } catch (err: any) {
      console.error('[TMA] Error:', err);
      setError(err.message || 'Произошла ошибка при поиске источников');
      if (webApp) {
        webApp.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setIsLoading(false);
      if (webApp) {
        webApp.MainButton.hideProgress();
      }
    }
  }, [text, isLoading, webApp]);

  useEffect(() => {
    console.log('[TMA] useEffect - checking for Telegram WebApp');
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      console.log('[TMA] Telegram WebApp found, initializing...');
      tg.ready();
      tg.expand();
      setWebApp(tg);

      // Настраиваем кнопку отправки
      tg.MainButton.setText('🔍 Найти источники');
      tg.MainButton.onClick(() => {
        console.log('[TMA] MainButton clicked');
        handleAnalyze();
      });
      tg.MainButton.show();

      // Настраиваем кнопку назад
      tg.BackButton.onClick(() => {
        tg.close();
      });
      tg.BackButton.show();

      return () => {
        tg.MainButton.offClick(() => {});
        tg.BackButton.offClick(() => {});
      };
    } else {
      console.warn('[TMA] Telegram WebApp not found - running outside Telegram?');
    }
  }, [handleAnalyze]);

  useEffect(() => {
    if (webApp) {
      // Обновляем состояние кнопки в зависимости от наличия текста
      if (text.trim().length > 0) {
        webApp.MainButton.enable();
      } else {
        webApp.MainButton.disable();
      }
    }
  }, [text, webApp]);

  const getTypeEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      official: '🏛️',
      news: '📰',
      blog: '✍️',
      research: '🔬',
      other: '🔗',
    };
    return emojis[type] || '🔗';
  };

  const getConfidenceEmoji = (confidence: string) => {
    const emojis: Record<string, string> = {
      high: '✅',
      medium: '⚠️',
      low: '❓',
    };
    return emojis[confidence] || '⚠️';
  };

  const getConfidenceColor = (confidence: string) => {
    const colors: Record<string, string> = {
      high: '#4CAF50',
      medium: '#FF9800',
      low: '#9E9E9E',
    };
    return colors[confidence] || '#9E9E9E';
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: webApp?.themeParams.bg_color || '#ffffff',
      color: webApp?.themeParams.text_color || '#000000',
      padding: '16px',
      paddingBottom: '80px', // Место для кнопки
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: webApp?.themeParams.text_color || '#000000',
        }}>
          🔍 FindOrigin
        </h1>
        <p style={{
          fontSize: '14px',
          color: webApp?.themeParams.hint_color || '#999999',
          marginBottom: '24px',
        }}>
          Введите текст для поиска источников
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Вставьте текст или ссылку на Telegram-пост..."
          disabled={isLoading}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '16px',
            border: `1px solid ${webApp?.themeParams.hint_color || '#e0e0e0'}`,
            borderRadius: '12px',
            backgroundColor: webApp?.themeParams.bg_color || '#ffffff',
            color: webApp?.themeParams.text_color || '#000000',
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '8px',
            fontSize: '14px',
          }}>
            ❌ {error}
          </div>
        )}

        {isLoading && (
          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            color: webApp?.themeParams.hint_color || '#999999',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
            <div>Ищу источники...</div>
          </div>
        )}

        {results.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '16px',
              color: webApp?.themeParams.text_color || '#000000',
            }}>
              📚 Найденные источники
            </h2>

            {results.map((result, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '16px',
                  padding: '16px',
                  backgroundColor: webApp?.themeParams.bg_color || '#ffffff',
                  border: `1px solid ${webApp?.themeParams.hint_color || '#e0e0e0'}`,
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>
                    {getTypeEmoji(result.sourceType)}
                  </span>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    margin: 0,
                    flex: 1,
                    color: webApp?.themeParams.text_color || '#000000',
                  }}>
                    {result.title.replace(/<b>/g, '').replace(/<\/b>/g, '')}
                  </h3>
                </div>

                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    color: webApp?.themeParams.link_color || '#1976d2',
                    textDecoration: 'none',
                    wordBreak: 'break-all',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  {result.url}
                </a>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}>
                  <span style={{ fontSize: '16px', marginRight: '4px' }}>
                    {getConfidenceEmoji(result.confidence)}
                  </span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: getConfidenceColor(result.confidence),
                  }}>
                    Релевантность: {result.relevanceScore}% ({result.confidence})
                  </span>
                </div>

                {result.explanation && (
                  <p style={{
                    fontSize: '14px',
                    color: webApp?.themeParams.hint_color || '#666666',
                    margin: '8px 0 0 0',
                    lineHeight: '1.4',
                  }}>
                    {result.explanation}
                  </p>
                )}

                {result.snippet && (
                  <p style={{
                    fontSize: '13px',
                    color: webApp?.themeParams.hint_color || '#666666',
                    margin: '8px 0 0 0',
                    fontStyle: 'italic',
                    lineHeight: '1.4',
                  }}>
                    {result.snippet.replace(/<b>/g, '').replace(/<\/b>/g, '').substring(0, 150)}...
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

