import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useProperty } from '../contexts/PropertyContext';
import { chatAPI } from '../utils/api';
import { ArrowLeft, Send, RotateCcw, User, Bot, Sparkles, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Chat() {
  const { selectedProperty } = useProperty();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save chat messages to localStorage whenever they change
  useEffect(() => {
    if (selectedProperty && messages.length > 0) {
      localStorage.setItem(`chat-messages-${selectedProperty.id}`, JSON.stringify(messages));
    }
  }, [messages, selectedProperty]);

  // Restore chat messages on page load
  useEffect(() => {
    if (selectedProperty && typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem(`chat-messages-${selectedProperty.id}`);
      if (savedMessages && messages.length === 0) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
          toast('Restored previous conversation', { 
            icon: '💬', 
            duration: 3000,
            style: {
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            },
          });
        } catch (e) {
          console.error('Failed to restore chat messages:', e);
          localStorage.removeItem(`chat-messages-${selectedProperty.id}`);
        }
      }
    }
  }, [selectedProperty]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedProperty || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await chatAPI.sendMessage(chatMessages, selectedProperty.id);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.response?.data?.message || 'Failed to send message', {
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#fca5a5',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        },
      });
      
      // Add error message to chat
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    // Clear from localStorage as well
    if (selectedProperty && typeof window !== 'undefined') {
      localStorage.removeItem(`chat-messages-${selectedProperty.id}`);
    }
    toast.success('Conversation cleared', {
      style: {
        background: 'rgba(34, 197, 94, 0.1)',
        color: '#86efac',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
      },
    });
  };

  if (!selectedProperty) {
    return (
      <div className="min-h-screen bg-space-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-gradient opacity-20 animate-gradient"></div>
        <div className="text-center relative z-10">
          <h1 className="text-2xl font-bold text-white mb-4">No Property Selected</h1>
          <p className="text-gray-400 mb-6">Please select a property to use the AI assistant.</p>
          <Link href="/" className="btn-primary">
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>AI Assistant - Encore FlightDeck</title>
        <meta name="description" content="Chat with AI assistant for event planning" />
      </Head>

      <div className="min-h-screen bg-space-900 flex flex-col relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-mesh-gradient opacity-10 animate-gradient"></div>
        
        {/* Header */}
        <header className="glass-card-dark border-b border-white/10 px-4 py-4 relative z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="icon-btn mr-4 group">
                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-white flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-primary-400" />
                  AI Assistant
                </h1>
                <p className="text-sm text-gray-400">{selectedProperty.name}</p>
              </div>
            </div>
            <button
              onClick={clearConversation}
              className="btn-secondary text-sm flex items-center"
              disabled={messages.length === 0}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Conversation
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {messages.length === 0 && (
              <div className="text-center py-12 animate-fade-in">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mx-auto mb-6 animate-float">
                  <Bot className="w-12 h-12 text-primary-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-3">
                  Welcome to the AI Assistant
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Describe your event requirements in natural language and I'll help you create 
                  detailed equipment orders and labor proposals.
                </p>
                <div className="glass-card-dark max-w-md mx-auto p-6 text-left">
                  <h3 className="font-medium text-white mb-4 flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-accent-400" />
                    Try asking:
                  </h3>
                  <ul className="text-sm text-gray-300 space-y-3">
                    <li className="flex items-start">
                      <span className="text-accent-400 mr-2">•</span>
                      "100 attendees, need audio for a panel in the Grand Ballroom"
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent-400 mr-2">•</span>
                      "Corporate event with projection and wireless mics"
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent-400 mr-2">•</span>
                      "Wedding reception with lighting and sound system"
                    </li>
                  </ul>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                >
                  <div className={`flex max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-glow' 
                          : 'bg-gradient-to-br from-accent-500/20 to-accent-600/20 border border-accent-500/30'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-5 h-5 text-white" />
                        ) : (
                          <Bot className="w-5 h-5 text-accent-400" />
                        )}
                      </div>
                    </div>
                    <div className={`${
                      message.role === 'user' 
                        ? 'chat-message-user' 
                        : 'chat-message-assistant'
                    }`}>
                      {message.role === 'assistant' ? (
                        <div className="markdown-content">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-white">{message.content}</p>
                      )}
                      <div className={`text-xs mt-3 ${
                        message.role === 'user' ? 'text-primary-200' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isLoading && (
              <div className="flex justify-start animate-slide-up">
                <div className="flex max-w-3xl">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500/20 to-accent-600/20 border border-accent-500/30 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-accent-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="chat-message-assistant">
                    <div className="loading-dots">
                      <div className="loading-dot"></div>
                      <div className="loading-dot"></div>
                      <div className="loading-dot"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="glass-card-dark border-t border-white/10 px-4 py-6 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex space-x-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your event requirements..."
                className="flex-1 input-field resize-none min-h-[80px]"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="btn-accent px-6 self-end group"
              >
                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
                AI Assistant ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 