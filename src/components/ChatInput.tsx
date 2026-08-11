import { Paperclip, Send, X, FileText, FileJson, File } from 'lucide-react'
import { useRef } from 'react'
import {
  ACCEPT_FILE_TYPES,
  MAX_ATTACHMENTS,
  type PendingAttachment,
} from '../utils/attachments'

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  isLoading: boolean
  pendingAttachments: PendingAttachment[]
  onFilesSelected: (files: FileList | null) => void
  onRemoveAttachment: (id: string) => void
  attachmentError?: string | null
}

function kindIcon(kind: PendingAttachment['kind']) {
  if (kind === 'scenario_json') return FileJson
  if (kind === 'text') return FileText
  return File
}

function kindLabel(kind: PendingAttachment['kind']) {
  if (kind === 'scenario_json') return 'Scenario'
  if (kind === 'text') return 'Text'
  return 'PDF'
}

export const ChatInput = ({
  input,
  setInput,
  handleSubmit,
  isLoading,
  pendingAttachments,
  onFilesSelected,
  onRemoveAttachment,
  attachmentError,
}: ChatInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canSend =
    Boolean(input.trim() || pendingAttachments.length > 0) && !isLoading

  return (
    <div className="absolute bottom-0 right-0 border-t left-64 bg-gray-900/80 backdrop-blur-sm border-orange-500/10">
      <div className="w-full max-w-3xl px-4 py-3 mx-auto">
        <form onSubmit={handleSubmit}>
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingAttachments.map((attachment) => {
                const Icon = kindIcon(attachment.kind)
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-200 border rounded-md border-orange-500/30 bg-gray-800/80"
                  >
                    <Icon className="w-3.5 h-3.5 text-orange-400" />
                    <span className="max-w-[160px] truncate">{attachment.name}</span>
                    <span className="text-gray-500">{kindLabel(attachment.kind)}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(attachment.id)}
                      className="p-0.5 text-gray-400 hover:text-white"
                      aria-label={`Remove ${attachment.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          {attachmentError && (
            <p className="mb-2 text-xs text-red-400">{attachmentError}</p>
          )}
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              placeholder="Ask away..."
              className="w-full py-3 pl-4 pr-20 overflow-hidden text-sm text-white placeholder-gray-400 border rounded-lg shadow-lg resize-none border-orange-500/20 bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '200px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 200) + 'px'
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={ACCEPT_FILE_TYPES}
              multiple
              onChange={(e) => {
                onFilesSelected(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              disabled={isLoading || pendingAttachments.length >= MAX_ATTACHMENTS}
              onClick={() => fileInputRef.current?.click()}
              className="absolute p-2 text-orange-500 transition-colors -translate-y-1/2 right-10 top-1/2 hover:text-orange-400 disabled:text-gray-500 focus:outline-none"
              aria-label="Attach file"
              title="Attach .json, .pdf, .txt, or .md"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!canSend}
              className="absolute p-2 text-orange-500 transition-colors -translate-y-1/2 right-2 top-1/2 hover:text-orange-400 disabled:text-gray-500 focus:outline-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
