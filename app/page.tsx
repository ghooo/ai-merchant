'use client';

import { useState } from 'react';
import ChatContainer from './components/ChatContainer';
import WidgetCard from './components/WidgetCard';

interface Message {
  role: string;
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string) => {
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error}` },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.response },
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const widgets = [
    {
      id: 'inventory',
      icon: '📦',
      title: 'Inventory Health',
      description: 'Check stock levels and recommendations',
      prompt: 'Show me my inventory health and restock recommendations',
    },
    {
      id: 'whatif',
      icon: '🔮',
      title: 'What-If Scenario',
      description: 'Run restock scenarios with custom variables',
      prompt: 'I want to run a what-if scenario for my inventory',
    },
    {
      id: 'trends',
      icon: '📈',
      title: 'Sales Trends',
      description: 'Analyze top-selling SKUs and patterns',
      prompt: 'Analyze my top-selling SKUs and sales trends',
    },
    {
      id: 'help',
      icon: '❓',
      title: 'How It Works',
      description: 'Learn about restock formulas',
      prompt: 'Explain how the restock formula works',
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            AI Merchant Assistant
          </h1>
          <p className="text-gray-500 mt-1">
            Manage inventory, get restock recommendations, and run what-if scenarios
          </p>
        </header>

        <ChatContainer
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
        />

        {messages.length === 0 && (
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-3">Quick actions:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {widgets.map(widget => (
                <WidgetCard
                  key={widget.id}
                  icon={widget.icon}
                  title={widget.title}
                  description={widget.description}
                  onClick={() => sendMessage(widget.prompt)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
