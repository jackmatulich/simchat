import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import type { Message } from '../utils/ai'
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const ChatMessage = ({ message }: { message: Message }) => {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isJsonExpanded, setIsJsonExpanded] = useState(false);

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

  // Helper to truncate JSON content for collapsible display
  function truncateJsonContent(content: string): { truncated: string; full: string; hasMore: boolean } {
    const lines = content.split('\n');
    if (lines.length <= 15) {
      return { truncated: content, full: content, hasMore: false };
    }
    
    const truncated = lines.slice(0, 15).join('\n') + '\n...';
    return { truncated, full: content, hasMore: true };
  }

  let jsonData: any = null;
  let scenarioName: string | null = null;
  jsonData = extractJson(message.content);
  scenarioName = jsonData?.scenarioName || null;

  // Check if this message contains JSON that should be collapsible
  const hasJsonContent = message.content.includes('```json') || message.content.includes('```') && jsonData;
  const { truncated, full, hasMore } = hasJsonContent ? truncateJsonContent(message.content) : { truncated: message.content, full: message.content, hasMore: false };

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
                  console.log('Preview JSON data:', jsonData);
                  const previewWindow = window.open('/preview.html', '_blank');
                  if (previewWindow) {
                    const handleReady = (event: MessageEvent) => {
                      if (event.data === 'previewer-ready') {
                        console.log('Previewer is ready, sending scenario JSON');
                        previewWindow.postMessage(JSON.stringify(jsonData), '*');
                        window.removeEventListener('message', handleReady);
                      }
                    };
                    window.addEventListener('message', handleReady);
                  }
                }}
                className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
              >
                Preview
              </button>
              {downloadError && <span className="text-red-500 text-xs">{downloadError}</span>}
            </div>
          )}
          
          {/* Collapsible content */}
          <div className="relative">
            <ReactMarkdown
              className="prose dark:prose-invert max-w-none"
              rehypePlugins={[
                rehypeRaw,
                rehypeSanitize,
                rehypeHighlight,
              ]}
            >
              {isJsonExpanded ? full : truncated}
            </ReactMarkdown>
            
            {/* Expand/Collapse button for JSON content */}
            {hasJsonContent && hasMore && (
              <button
                onClick={() => setIsJsonExpanded(!isJsonExpanded)}
                className="flex items-center gap-1 mt-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                {isJsonExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show More
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 