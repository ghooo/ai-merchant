interface MessageBubbleProps {
  role: string;
  content: string;
  isLoading?: boolean;
}

export default function MessageBubble({
  role,
  content,
  isLoading,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3 flex-shrink-0 text-sm">
          AI
        </div>
      )}
      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        {isLoading ? (
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap">{content}</div>
        )}
      </div>
    </div>
  );
}
