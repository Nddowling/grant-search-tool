'use client';

import { useState, useRef, useEffect } from 'react';

export default function GrantAssistantChat({ userProfile, onGrantSelect, onClose, isOpen }) {
  // Don't render if not open
  if (!isOpen) return null;
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your Grant Assistant. I'll help you find the perfect funding opportunities for your organization.\n\nTell me about your organization and what kind of funding you're looking for, and I'll search our databases to find the best matches.",
      type: 'text'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim(), type: 'text' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for API
      const conversationHistory = [...messages, userMessage]
        .filter(m => m.type === 'text')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          userProfile,
        }),
      });

      if (!response.ok) throw new Error('Chat failed');

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentAssistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'status') {
                // Show status update
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.type === 'status') {
                    return [...prev.slice(0, -1), { role: 'assistant', type: 'status', content: data.content }];
                  }
                  return [...prev, { role: 'assistant', type: 'status', content: data.content }];
                });
              } else if (data.type === 'text') {
                currentAssistantMessage += data.content;
                setMessages(prev => {
                  // Remove any status message and add/update text
                  const filtered = prev.filter(m => m.type !== 'status');
                  const last = filtered[filtered.length - 1];
                  if (last?.role === 'assistant' && last?.type === 'text' && last?.isStreaming) {
                    return [...filtered.slice(0, -1), { role: 'assistant', type: 'text', content: currentAssistantMessage, isStreaming: true }];
                  }
                  return [...filtered, { role: 'assistant', type: 'text', content: currentAssistantMessage, isStreaming: true }];
                });
              } else if (data.type === 'search_results') {
                setSearchResults(data.content);
                setMessages(prev => [
                  ...prev.filter(m => m.type !== 'status'),
                  { role: 'assistant', type: 'search_results', content: data.content }
                ]);
              } else if (data.type === 'done') {
                // Mark message as complete
                setMessages(prev => prev.map(m =>
                  m.isStreaming ? { ...m, isStreaming: false } : m
                ));
              } else if (data.type === 'error') {
                setMessages(prev => [...prev, { role: 'assistant', type: 'error', content: data.content }]);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        type: 'error',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleGrantClick = (grant) => {
    if (onGrantSelect) {
      onGrantSelect(grant);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl h-[600px] flex flex-col bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Grant Assistant</h3>
              <p className="text-xs text-blue-100">Pro Feature - AI-Powered Search</p>
            </div>
          </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.type === 'status' ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                {message.content}
              </div>
            ) : message.type === 'search_results' ? (
              <div className="w-full">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Found {message.content.totalFound} grants for "{message.content.searchTerms}"
                </div>
                <div className="space-y-2">
                  {message.content.grants.slice(0, 5).map((grant, i) => (
                    <button
                      key={grant.id || i}
                      onClick={() => handleGrantClick(grant)}
                      className="w-full text-left p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded uppercase">
                              {grant.source}
                            </span>
                            {grant.deadline && grant.deadline !== 'Not specified' && (
                              <span className="text-xs text-amber-400">
                                Due: {new Date(grant.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                            {grant.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">{grant.agency}</p>
                        </div>
                        <svg className="w-4 h-4 text-slate-500 group-hover:text-blue-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : message.type === 'error' ? (
              <div className="max-w-[85%] p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                {message.content}
              </div>
            ) : (
              <div
                className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                {message.content}
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-blue-400 animate-pulse" />
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your organization and funding needs..."
            rows={2}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
      </div>
    </div>
  );
}
