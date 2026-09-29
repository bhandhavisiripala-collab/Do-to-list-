import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Settings2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { n8nService } from '../services/api';

const DEFAULT_WEBHOOK_URL =
  'https://sbhandhavi21.app.n8n.cloud/webhook/845861b4-d675-4c88-8109-02a5e7acef3d/chat';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
  isError?: boolean;
  hint?: string;
  isInactive?: boolean;
}

interface N8nChatWidgetProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export const N8nChatWidget: React.FC<N8nChatWidgetProps> = ({ isOpen, onToggle }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(() => {
    return localStorage.getItem('n8n_webhook_url') || DEFAULT_WEBHOOK_URL;
  });
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem('n8n_chat_session_id');
    if (existing) return existing;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.setItem('n8n_chat_session_id', newId);
    return newId;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSaveWebhook = (url: string) => {
    const clean = url.trim() || DEFAULT_WEBHOOK_URL;
    setWebhookUrl(clean);
    localStorage.setItem('n8n_webhook_url', clean);
    setShowSettings(false);
  };

  const handleUseTestUrl = () => {
    const testUrl = DEFAULT_WEBHOOK_URL.replace('/webhook/', '/webhook-test/');
    handleSaveWebhook(testUrl);
  };

  const handleUseProdUrl = () => {
    handleSaveWebhook(DEFAULT_WEBHOOK_URL);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputValue('');
    setIsLoading(true);

    try {
      const response = await n8nService.sendMessage(textToSend.trim(), sessionId, webhookUrl);

      if (response.error) {
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}-err`,
          sender: 'system',
          text: response.error,
          hint: response.hint,
          isInactive: response.isInactiveWorkflow,
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } else {
        const agentMsg: ChatMessage = {
          id: `msg-${Date.now()}-agent`,
          sender: 'agent',
          text: response.reply || 'Task completed.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, agentMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'system',
        text: err.message || 'Failed to connect to the n8n agent.',
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const isTestMode = webhookUrl.includes('/webhook-test/');

  return (
    <>
      {/* Floating Trigger Button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => onToggle(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group cursor-pointer border border-slate-700/50"
          title="Chat with n8n AI Agent"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-indigo-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-bold tracking-wide">n8n AI Agent</span>
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 flex flex-col bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden ${
            isExpanded
              ? 'inset-4 md:inset-10'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-950 flex items-center justify-center border border-indigo-700/50">
                <Bot className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white tracking-wide truncate">
                    n8n AI Agent
                  </h3>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      isTestMode
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isTestMode ? 'Test Webhook' : 'Live Webhook'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  sbhandhavi21.app.n8n.cloud
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                title="Webhook Settings"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Settings2 className="w-4 h-4" />
              </button>

              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  title="Clear chat"
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse' : 'Expand'}
                className="hidden sm:block p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={() => onToggle(false)}
                title="Close"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Webhook Configuration Popover/Banner */}
          {showSettings && (
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Webhook URL
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full text-xs font-mono p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <button
                    onClick={handleUseProdUrl}
                    className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded font-medium hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    Prod URL
                  </button>
                  <button
                    onClick={handleUseTestUrl}
                    className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded font-medium hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    Test URL
                  </button>
                </div>
                <button
                  onClick={() => handleSaveWebhook(webhookUrl)}
                  className="px-3 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    n8n AI Agent Connected
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Your n8n webhook workflow is integrated. Ask questions, request automations, or brainstorm tasks.
                  </p>
                </div>

                {/* Quick Prompts */}
                <div className="w-full max-w-xs space-y-1.5 pt-2">
                  <button
                    onClick={() => handleSendMessage('Help me plan my next event.')}
                    className="w-full text-left text-xs p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  >
                    💡 Help me plan my next event
                  </button>
                  <button
                    onClick={() => handleSendMessage('Break down a software project into milestones.')}
                    className="w-full text-left text-xs p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  >
                    📋 Break down a software project into milestones
                  </button>
                  <button
                    onClick={() => handleSendMessage('What can this n8n AI agent do?')}
                    className="w-full text-left text-xs p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  >
                    🤖 What can this n8n AI agent do?
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                      msg.sender === 'user'
                        ? 'bg-slate-900 text-white rounded-br-xs'
                        : msg.isError
                        ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-xs'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-2xs rounded-bl-xs'
                    }`}
                  >
                    {/* Message Body */}
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.text}
                    </div>

                    {/* Inactive Workflow Helper Note */}
                    {msg.isInactive && (
                      <div className="mt-2.5 pt-2.5 border-t border-rose-200/80 text-[11px] text-rose-700">
                        <div className="flex items-start gap-1.5 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span>How to activate your n8n workflow:</span>
                        </div>
                        <ol className="list-decimal list-inside mt-1 space-y-0.5 text-slate-600 pl-1">
                          <li>Open your n8n workflow canvas.</li>
                          <li>
                            Toggle the switch in the top-right corner to{' '}
                            <span className="font-bold text-slate-900">Active</span>.
                          </li>
                          <li>
                            Or use the{' '}
                            <button
                              onClick={handleUseTestUrl}
                              className="font-bold underline text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              Test Webhook URL
                            </button>{' '}
                            while testing on the canvas.
                          </li>
                        </ol>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit text-xs text-slate-500 shadow-2xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                <span>n8n agent is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder="Message your n8n agent..."
              className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
