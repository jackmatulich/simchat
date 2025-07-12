import { PlusCircle, MessageCircle, Trash2, Edit2, Download, Eye } from 'lucide-react';

interface SidebarProps {
  conversations: Array<{ id: string; title: string; scenarioInfo?: any }>;
  currentConversationId: string | null;
  handleNewChat: () => void;
  setCurrentConversationId: (id: string) => void;
  handleDeleteChat: (id: string) => void;
  editingChatId: string | null;
  setEditingChatId: (id: string | null) => void;
  editingTitle: string;
  setEditingTitle: (title: string) => void;
  handleUpdateChatTitle: (id: string, title: string) => void;
}

export const Sidebar = ({ 
  conversations, 
  currentConversationId, 
  handleNewChat, 
  setCurrentConversationId, 
  handleDeleteChat, 
  editingChatId, 
  setEditingChatId, 
  editingTitle, 
  setEditingTitle, 
  handleUpdateChatTitle 
}: SidebarProps) => {
  
  const handleDownload = (scenarioInfo: any) => {
    if (!scenarioInfo?.scenarioName || !scenarioInfo?.jsonData) return;
    try {
      const blob = new Blob([JSON.stringify(scenarioInfo.jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scenarioInfo.scenarioName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download JSON:', err);
    }
  };

  const handlePreview = (scenarioInfo: any) => {
    if (!scenarioInfo?.jsonData) return;
    console.log('Preview JSON data:', scenarioInfo.jsonData);
    const previewWindow = window.open('/preview.html', '_blank');
    if (previewWindow) {
      const handleReady = (event: MessageEvent) => {
        if (event.data === 'previewer-ready') {
          console.log('Previewer is ready, sending scenario JSON');
          previewWindow.postMessage(JSON.stringify(scenarioInfo.jsonData), '*');
          window.removeEventListener('message', handleReady);
        }
      };
      window.addEventListener('message', handleReady);
    }
  };

  return (
    <div className="flex flex-col w-64 bg-gray-800 border-r border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={handleNewChat}
          className="flex items-center justify-center w-full gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <PlusCircle className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((chat) => (
          <div
            key={chat.id}
            className={`group flex flex-col gap-1 px-3 py-2 cursor-pointer hover:bg-gray-700/50 ${
              chat.id === currentConversationId ? 'bg-gray-700/50' : ''
            }`}
            onClick={() => setCurrentConversationId(chat.id)}
          >
            {/* Main chat row */}
            <div className="flex items-center gap-3">
              <MessageCircle className="w-4 h-4 text-gray-400" />
              {editingChatId === chat.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    if (editingTitle.trim()) {
                      handleUpdateChatTitle(chat.id, editingTitle)
                    }
                    setEditingChatId(null)
                    setEditingTitle('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editingTitle.trim()) {
                      handleUpdateChatTitle(chat.id, editingTitle)
                    } else if (e.key === 'Escape') {
                      setEditingChatId(null)
                      setEditingTitle('')
                    }
                  }}
                  className="flex-1 text-sm text-white bg-transparent focus:outline-none"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm text-gray-300 truncate">
                  {chat.scenarioInfo?.scenarioName || chat.title}
                </span>
              )}
              <div className="items-center hidden gap-1 group-hover:flex">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingChatId(chat.id)
                    setEditingTitle(chat.scenarioInfo?.scenarioName || chat.title)
                  }}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteChat(chat.id)
                  }}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Scenario action buttons */}
            {chat.scenarioInfo && (
              <div className="flex items-center gap-1 ml-7">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePreview(chat.scenarioInfo)
                  }}
                  className="p-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                  title="Preview Scenario"
                >
                  <Eye className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(chat.scenarioInfo)
                  }}
                  className="p-1 text-xs text-gray-400 hover:text-green-400 transition-colors"
                  title="Download Scenario"
                >
                  <Download className="w-3 h-3" />
                </button>
                <span className="text-xs text-gray-500 ml-1">
                  {chat.scenarioInfo.scenarioType || 'Scenario'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 