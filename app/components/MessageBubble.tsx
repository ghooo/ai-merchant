import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
        className={`${isUser ? 'max-w-[70%]' : 'max-w-[95%]'} px-4 py-3 rounded-2xl ${
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
        ) : isUser ? (
          <div className="text-sm whitespace-pre-wrap">{content}</div>
        ) : (
          <div className="text-sm prose prose-sm max-w-none prose-table:text-xs">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse border border-gray-300" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => (
                  <thead className="bg-gray-200" {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="border border-gray-300 px-3 py-2" {...props} />
                ),
                tr: ({ node, ...props }) => (
                  <tr className="hover:bg-gray-50" {...props} />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
