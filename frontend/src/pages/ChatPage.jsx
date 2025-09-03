// ===================================
// src/pages/ChatPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageCircle } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAsyncAction } from '../hooks/useApi';
import { chatService } from '../services/api';

const ChatPage = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: `Bonjour ! Je suis votre assistant virtuel du Bureau National de l'État Civil (BUNEC). 

🎯 **Je peux vous aider avec :**
• Procédures d'état civil (naissance, mariage, décès)
• Recherche dans le Fichier National de l'Individu
• Informations sur les documents requis
• Contacts des centres d'état civil

Comment puis-je vous aider aujourd'hui ?`,
      timestamp: new Date(),
      suggestions: [
        'Procédure acte de naissance',
        'Recherche dans le FNI',
        'Documents pour mariage',
        'Contact BUNEC'
      ]
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const { loading, error, execute } = useAsyncAction();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');

    try {
      const response = await execute(() => chatService.sendMessage(currentInput));
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.response,
        timestamp: new Date(),
        suggestions: response.suggestions || []
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Désolé, je rencontre un problème technique. Pouvez-vous reformuler votre question ?',
        timestamp: new Date(),
        suggestions: ['Réessayer', 'Contact support']
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Assistant IA - État Civil
        </h1>
        <p className="text-gray-600">
          Posez vos questions sur les procédures d'état civil
        </p>
      </div>

      {/* Chat Container */}
      <div className="card p-0 h-[600px] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <LoadingSpinner size="sm" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tapez votre question sur l'état civil..."
              className="flex-1 input-field resize-none"
              rows="2"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || loading}
              className="btn-primary self-end"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageBubble = ({ message }) => {
  const isBot = message.type === 'bot';
  
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[80%] flex space-x-3 ${isBot ? '' : 'flex-row-reverse space-x-reverse'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isBot 
            ? 'bg-gradient-to-r from-fni-blue-500 to-fni-green-500' 
            : 'bg-gradient-to-r from-fni-green-500 to-fni-blue-500'
        }`}>
          {isBot ? (
            <Bot className="h-4 w-4 text-white" />
          ) : (
            <User className="h-4 w-4 text-white" />
          )}
        </div>
        
        {/* Message Content */}
        <div className={`${isBot ? 'text-left' : 'text-right'}`}>
          <div className={`inline-block p-4 rounded-lg ${
            isBot
              ? 'bg-gray-100 text-gray-900'
              : 'bg-fni-blue-600 text-white'
          }`}>
            <div className="whitespace-pre-line text-sm">
              {message.content}
            </div>
          </div>
          
          <div className={`text-xs text-gray-500 mt-1 ${
            isBot ? 'text-left' : 'text-right'
          }`}>
            {message.timestamp.toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
          
          {/* Suggestions */}
          {message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;