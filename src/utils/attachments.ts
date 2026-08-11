import { PDFDocument, PDFName, decodePDFRawStream } from 'pdf-lib'
import type { AttachmentKind, MessageAttachment } from './ai'

export const MAX_ATTACHMENTS = 3
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_TEXT_CHARS = 100_000
export const DEFAULT_ATTACHMENT_PROMPT =
  'Use the attached file(s) as context for this request.'

const ALLOWED_EXTENSIONS = new Set(['json', 'pdf', 'txt', 'md'])

export interface PendingAttachment {
  id: string
  file: File
  name: string
  mimeType: string
  kind: AttachmentKind
  sizeBytes: number
  /** Injected into message content for scenario_json / text */
  extractedText?: string
}

export class AttachmentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AttachmentError'
  }
}

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

function truncateText(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_TEXT_CHARS) {
    return { text, truncated: false }
  }
  return {
    text:
      text.slice(0, MAX_TEXT_CHARS) +
      '\n\n[Content truncated: attachment exceeded character limit.]',
    truncated: true,
  }
}

async function tryExtractSimChatScenarioJson(
  bytes: Uint8Array,
): Promise<string | null> {
  try {
    const pdfDoc = await PDFDocument.load(bytes)
    const realitiRef = pdfDoc.catalog.get(PDFName.of('Realiti360'))
    if (!realitiRef) return null

    // pdf-lib Catalog refs are looked up via context; cast for TS.
    const realiti = pdfDoc.context.lookup(realitiRef as any) as any
    if (!realiti?.get) return null

    const projectStateRef = realiti.get(PDFName.of('ProjectState'))
    if (!projectStateRef) return null

    const projectStateStream = pdfDoc.context.lookup(projectStateRef as any)
    const decodedBytes = decodePDFRawStream(projectStateStream as any).decode()
    const jsonText = new TextDecoder().decode(decodedBytes)
    return JSON.stringify(JSON.parse(jsonText), null, 2)
  } catch {
    return null
  }
}

export async function processFile(file: File): Promise<PendingAttachment> {
  if (file.size > MAX_FILE_BYTES) {
    throw new AttachmentError(
      `"${file.name}" exceeds the 10 MB limit.`,
    )
  }

  const ext = getExtension(file.name)
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new AttachmentError(
      `"${file.name}" is not supported. Use .json, .pdf, .txt, or .md.`,
    )
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const base = {
    id,
    file,
    name: file.name,
    mimeType: file.type || guessMimeType(ext),
    sizeBytes: file.size,
  }

  if (ext === 'json') {
    const raw = await file.text()
    let pretty: string
    try {
      pretty = JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      throw new AttachmentError(`"${file.name}" is not valid JSON.`)
    }
    const { text } = truncateText(pretty)
    return {
      ...base,
      kind: 'scenario_json',
      mimeType: 'application/json',
      extractedText: text,
    }
  }

  if (ext === 'txt' || ext === 'md') {
    const raw = await file.text()
    const { text } = truncateText(raw)
    return {
      ...base,
      kind: 'text',
      mimeType: ext === 'md' ? 'text/markdown' : 'text/plain',
      extractedText: text,
    }
  }

  // PDF: SimChat embed → scenario_json; otherwise native document
  const bytes = new Uint8Array(await file.arrayBuffer())
  const scenarioJson = await tryExtractSimChatScenarioJson(bytes)
  if (scenarioJson) {
    const { text } = truncateText(scenarioJson)
    return {
      ...base,
      kind: 'scenario_json',
      mimeType: 'application/pdf',
      extractedText: text,
    }
  }

  return {
    ...base,
    kind: 'pdf_document',
    mimeType: 'application/pdf',
  }
}

export async function processFiles(files: FileList | File[]): Promise<PendingAttachment[]> {
  const list = Array.from(files)
  if (list.length === 0) return []
  if (list.length > MAX_ATTACHMENTS) {
    throw new AttachmentError(`You can attach up to ${MAX_ATTACHMENTS} files per message.`)
  }
  const results: PendingAttachment[] = []
  for (const file of list) {
    results.push(await processFile(file))
  }
  return results
}

function guessMimeType(ext: string): string {
  switch (ext) {
    case 'json':
      return 'application/json'
    case 'pdf':
      return 'application/pdf'
    case 'md':
      return 'text/markdown'
    case 'txt':
      return 'text/plain'
    default:
      return 'application/octet-stream'
  }
}

export function buildAttachmentInjectBlocks(
  attachments: PendingAttachment[],
): string {
  const blocks: string[] = []
  for (const attachment of attachments) {
    if (attachment.kind === 'scenario_json' && attachment.extractedText) {
      blocks.push(
        [
          `[Attached scenario JSON: ${attachment.name}]`,
          'Treat this as an existing simulation to rebuild, refine, or align with.',
          '```json',
          attachment.extractedText,
          '```',
        ].join('\n'),
      )
    } else if (attachment.kind === 'text' && attachment.extractedText) {
      blocks.push(
        [
          `[Attached document: ${attachment.name}]`,
          'Treat this as policy, article, or reference material to align with.',
          '```',
          attachment.extractedText,
          '```',
        ].join('\n'),
      )
    } else if (attachment.kind === 'pdf_document') {
      blocks.push(
        `[Attached PDF: ${attachment.name} — content provided to the model as a document.]`,
      )
    }
  }
  return blocks.join('\n\n')
}

export function composeUserMessageContent(
  displayText: string,
  attachments: PendingAttachment[],
): { content: string; displayText: string } {
  const typed =
    displayText.trim() ||
    (attachments.length > 0 ? DEFAULT_ATTACHMENT_PROMPT : '')
  const inject = buildAttachmentInjectBlocks(attachments)
  const content = inject ? `${typed}\n\n${inject}` : typed
  return { content, displayText: typed }
}

export function toMessageAttachments(
  pending: PendingAttachment[],
  storageIds: Record<string, string> = {},
): MessageAttachment[] {
  return pending.map((p) => ({
    id: p.id,
    name: p.name,
    mimeType: p.mimeType,
    kind: p.kind,
    sizeBytes: p.sizeBytes,
    ...(p.kind === 'pdf_document' && storageIds[p.id]
      ? { storageId: storageIds[p.id] }
      : {}),
  }))
}

export const ACCEPT_FILE_TYPES = '.json,.pdf,.txt,.md,application/json,application/pdf,text/plain,text/markdown'
