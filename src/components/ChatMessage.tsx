import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import type { Message } from '../utils/ai'
import { useState } from 'react';

export const ChatMessage = ({ message }: { message: Message }) => {
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Helper to robustly extract JSON from message content
  function extractJson(content: string): any {
    let cleaned = content.trim();
    // Try to extract the first code block (```json ... ``` or ``` ... ```)
    const codeBlockMatch = cleaned.match(/```(?:json)?([\s\S]*?)```/i);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {}
    }
    // If no code block, try to find the first {...} block
    const curlyMatch = cleaned.match(/({[\s\S]*})/);
    if (curlyMatch) {
      try {
        return JSON.parse(curlyMatch[1]);
      } catch {}
    }
    // As a last resort, try the whole content
    try {
      return JSON.parse(cleaned);
    } catch {}
    return null;
  }
  let jsonData: any = null;
  let scenarioName: string | null = null;
  jsonData = extractJson(message.content);
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
                className="px-3 py-1 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 rounded"
              >
                Download Realiti File
              </button>
              <button
                onClick={() => {
                  const previewWindow = window.open('/preview', '_blank');
                  if (previewWindow) {
                    // Wait for the new window to load, then post the JSON
                    const sendData = () => {
                      previewWindow.postMessage(JSON.stringify(jsonData), '*');
                    };
                    // Try to send after a short delay (in case the window is not ready)
                    setTimeout(sendData, 400);
                  }
                }}
                className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
              >
                Preview
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