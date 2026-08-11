import { Paperclip, Send, X, FileText, FileJson, File } from 'lucide-react'
import { useRef } from 'react'
import {
  ACCEPT_FILE_TYPES,
  MAX_ATTACHMENTS,
  type PendingAttachment,
} from '../utils/attachments'

interface WelcomeScreenProps {
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

export const WelcomeScreen = ({
  input,
  setInput,
  handleSubmit,
  isLoading,
  pendingAttachments,
  onFilesSelected,
  onRemoveAttachment,
  attachmentError,
}: WelcomeScreenProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canSend =
    Boolean(input.trim() || pendingAttachments.length > 0) && !isLoading

  return (
    <div className="flex items-center justify-center flex-1 px-4">
      <div className="w-full max-w-3xl mx-auto text-center">
        <h1 className="mb-4 text-6xl font-bold text-transparent uppercase bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text">
          <span className="text-white">Sim</span>Chat
        </h1>
        <p className="w-2/3 mx-auto mb-6 text-lg text-gray-400">
          A comprehensive clinical scenario generator for the iSimulate Realiti
          Environment powered by Anthropic AI.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="relative max-w-xl mx-auto">
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-2">
                {pendingAttachments.map((attachment) => {
                  const Icon = kindIcon(attachment.kind)
                  return (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-200 border rounded-md border-orange-500/30 bg-gray-800/80"
                    >
                      <Icon className="w-3.5 h-3.5 text-orange-400" />
                      <span className="max-w-[160px] truncate">
                        {attachment.name}
                      </span>
                      <span className="text-gray-500">
                        {kindLabel(attachment.kind)}
                      </span>
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
              <p className="mb-2 text-xs text-left text-red-400">
                {attachmentError}
              </p>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              placeholder="Give me a scenario where..."
              className="w-full py-3 pl-4 pr-20 overflow-hidden text-sm text-white placeholder-gray-400 border rounded-lg resize-none border-orange-500/20 bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
              rows={1}
              style={{ minHeight: '88px' }}
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
              className="absolute p-2 text-orange-500 transition-colors right-10 bottom-3 hover:text-orange-400 disabled:text-gray-500 focus:outline-none"
              aria-label="Attach file"
              title="Attach .json, .pdf, .txt, or .md"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!canSend}
              className="absolute p-2 text-orange-500 transition-colors right-2 bottom-3 hover:text-orange-400 disabled:text-gray-500 focus:outline-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
