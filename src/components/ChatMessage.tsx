import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import type { Message } from '../utils/ai'
import { useState } from 'react';

export const ChatMessage = ({ message }: { message: Message }) => {
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Helper to check if content is valid JSON and extract scenarioName
  let jsonData: any = null;
  let scenarioName: string | null = null;
  function tryParseJson(content: string): any {
    // Remove code block markers if present
    let cleaned = content.trim();
    // Match ```json ... ``` or ``` ... ```
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    }
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
  jsonData = tryParseJson(message.content);
  scenarioName = jsonData?.scenarioName || null;

  const handleDownload = () => {
    if (!jsonData || !scenarioName) return;
    try {
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scenarioName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadError(null);
    } catch (err: any) {
      setDownloadError('Failed to download JSON.');
    }
  };

  return (
    <div
      className={`py-6 ${
        message.role === 'assistant'
          ? 'bg-gradient-to-r from-orange-500/5 to-red-600/5'
          : 'bg-transparent'
      }`}
    >
      <div className="flex items-start w-full max-w-3xl gap-4 mx-auto">
        {message.role === 'assistant' ? (
          <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 ml-4 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-orange-500 to-red-600">
            AI
          </div>
        ) : (
          <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-medium text-white bg-gray-700 rounded-lg">
            Y
          </div>
        )}
        <div className="flex-1 min-w-0 mr-4">
          {/* Download button for valid JSON AI responses */}
          {message.role === 'assistant' && jsonData && scenarioName && (
            <div className="mb-2 flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1 text-xs font-semibold text-white bg-orange-500 rounded hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                Download JSON
              </button>
              {downloadError && <span className="text-red-500 text-xs">{downloadError}</span>}
            </div>
          )}
          <ReactMarkdown
            className="prose dark:prose-invert max-w-none"
            rehypePlugins={[
              rehypeRaw,
              rehypeSanitize,
              rehypeHighlight,
            ]}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}; 