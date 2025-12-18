import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Settings } from 'lucide-react'
import { 
  SettingsDialog, 
  ChatMessage, 
  LoadingIndicator, 
  ChatInput, 
  Sidebar, 
  WelcomeScreen 
} from '../components'
import { useConversations, useAppState, store, actions } from '../store'
import { genAIResponse, type Message } from '../utils'

function Home() {
  const {
    conversations,
    currentConversationId,
    currentConversation,
    setCurrentConversationId,
    createNewConversation,
    updateConversationTitle,
    deleteConversation,
    addMessage,
  } = useConversations()
  
  const { isLoading, setLoading, getActivePrompt, selectedModel, setSelectedModel } = useAppState()

  // Memoize messages to prevent unnecessary re-renders
  const messages = useMemo(() => currentConversation?.messages || [], [currentConversation]);

  // Check if Anthropic API key is defined
  const isAnthropicKeyDefined = Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY);

  // Local state
  const [input, setInput] = useState('')
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null)
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight
    }
  }, []);

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  // Hide loading indicator when a new assistant message is received
  useEffect(() => {
    if (isLoading && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        // AI response received, hide loading indicator
        setLoading(false);
      }
    }
  }, [messages, isLoading, setLoading]);

  const createTitleFromInput = useCallback((text: string) => {
    const words = text.trim().split(/\s+/)
    const firstThreeWords = words.slice(0, 3).join(' ')
    return firstThreeWords + (words.length > 3 ? '...' : '')
  }, []);

  // Helper function to process AI response
  const processAIResponse = useCallback(async (conversationId: string, userMessage: Message) => {
    try {
      // Get active prompt
      const activePrompt = getActivePrompt(store.state)
      let systemPrompt
      if (activePrompt) {
        systemPrompt = {
          value: activePrompt.content,
          enabled: true,
        }
      }

      // Get AI response
      const response = await genAIResponse({
        messages: [...messages, userMessage],
        systemPrompt,
        conversationId, // ensure conversationId is passed if needed
        model: selectedModel,
      });

      // If using background function, response will be undefined
      if (typeof response === 'undefined') {
        // Background function: AI response will be added to Convex later
        return;
      }

      // For non-background (should not happen), just return
      // (existing streaming code would go here if needed)
    } catch (error) {
      console.error('Error in AI response:', error)
      // Add an error message to the conversation
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error generating a response. Please set the required API keys in your environment variables.',
      }
      await addMessage(conversationId, errorMessage)
    }
  }, [messages, getActivePrompt, addMessage, selectedModel]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const currentInput = input
    setInput('') // Clear input early for better UX
    setLoading(true)
    setError(null)
    
    const conversationTitle = createTitleFromInput(currentInput)

    try {
      // Create the user message object
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: currentInput.trim(),
      }
      
      let conversationId = currentConversationId

      // If no current conversation, create one with the user's request as title
      if (!conversationId) {
        try {
          console.log('Creating new Convex conversation with title:', conversationTitle)
          // Create a new conversation with the user's request as title
          const convexId = await createNewConversation(conversationTitle)
          
          if (convexId) {
            console.log('Successfully created Convex conversation with ID:', convexId)
            conversationId = convexId
            
            // Add user message directly to Convex
            console.log('Adding user message to Convex conversation:', userMessage.content)
            await addMessage(conversationId, userMessage)
          } else {
            console.warn('Failed to create Convex conversation, falling back to local')
            // Fallback to local storage if Convex creation failed
            const tempId = Date.now().toString()
            const tempConversation = {
              id: tempId,
              title: conversationTitle,
              messages: [],
            }
            
            actions.addConversation(tempConversation)
            conversationId = tempId
            
            // Add user message to local state
            actions.addMessage(conversationId, userMessage)
          }
        } catch (error) {
          console.error('Error creating conversation:', error)
          throw new Error('Failed to create conversation')
        }
      } else {
        // We already have a conversation ID, add message directly to Convex
        console.log('Adding user message to existing conversation:', conversationId)
        await addMessage(conversationId, userMessage)
      }
      
      // Process with AI after message is stored
      await processAIResponse(conversationId, userMessage)
      
      // Note: Don't set loading to false here - it will be set to false when the AI response is received
      
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error processing your request.',
      }
      if (currentConversationId) {
        await addMessage(currentConversationId, errorMessage)
      }
      else {
        if (error instanceof Error) {
          setError(error.message)
        } else {
          setError('An unknown error occurred.')
        }
      }
      // Set loading to false on error
      setLoading(false)
    }
  }, [input, isLoading, createTitleFromInput, currentConversationId, createNewConversation, addMessage, processAIResponse, setLoading]);

  const handleNewChat = useCallback(() => {
    // Clear current conversation without creating a new one
    // A new conversation will be created when the user sends their first message
    setCurrentConversationId(null)
  }, [setCurrentConversationId]);

  const handleDeleteChat = useCallback(async (id: string) => {
    await deleteConversation(id)
  }, [deleteConversation]);

  const handleUpdateChatTitle = useCallback(async (id: string, title: string) => {
    await updateConversationTitle(id, title)
    setEditingChatId(null)
    setEditingTitle('')
  }, [updateConversationTitle]);

  return (
    <div className="relative flex h-screen bg-gray-900">
      {/* Model Selector and Settings Button */}
      <div className="absolute z-50 flex items-center gap-3 top-5 right-5">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="px-3 py-2 text-sm text-white border rounded-lg bg-gray-800/80 backdrop-blur-sm border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <optgroup label="Claude 3.5">
            <option value="claude-3-5-sonnet-latest">3.5 Sonnet (Latest)</option>
            <option value="claude-3-5-sonnet-20241022">3.5 Sonnet (Oct 2024)</option>
            <option value="claude-3-5-haiku-20241022">3.5 Haiku (Oct 2024)</option>
          </optgroup>
          <optgroup label="Claude 3">
            <option value="claude-3-opus-20240229">3 Opus</option>
            <option value="claude-3-sonnet-20240229">3 Sonnet</option>
            <option value="claude-3-haiku-20240307">3 Haiku</option>
          </optgroup>
          <optgroup label="Experimental / Future">
            <option value="claude-haiku-4-5-20251001">Haiku 4.5 (Oct 2025)</option>
          </optgroup>
        </select>
        
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center justify-center w-10 h-10 text-white transition-opacity rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar 
        conversations={conversations}
        currentConversationId={currentConversationId}
        handleNewChat={handleNewChat}
        setCurrentConversationId={setCurrentConversationId}
        handleDeleteChat={handleDeleteChat}
        editingChatId={editingChatId}
        setEditingChatId={setEditingChatId}
        editingTitle={editingTitle}
        setEditingTitle={setEditingTitle}
        handleUpdateChatTitle={handleUpdateChatTitle}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        {!isAnthropicKeyDefined && (
          <div className="w-full max-w-3xl px-2 py-2 mx-auto mt-4 mb-2 font-medium text-center text-white bg-orange-500 rounded-md text-sm">
            <p>This app requires an Anthropic API key to work properly. Update your <code>.env</code> file or get a <a href='https://console.anthropic.com/settings/keys' className='underline'>new Anthropic key</a>.</p>
            <p>For local development, use <a href='https://www.netlify.com/products/dev/' className='underline'>netlify dev</a> to automatically load environment variables.</p>
          </div>
        )}
        {error && (
          <p className="w-full max-w-3xl p-4 mx-auto font-bold text-orange-500">{error}</p>
        )}
        {currentConversationId ? (
          <>
            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 pb-24 overflow-y-auto"
            >
              <div className="w-full max-w-3xl px-4 mx-auto">
                {[...messages, pendingMessage]
                  .filter((message): message is Message => message !== null)
                  .map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                {isLoading && <LoadingIndicator message="Great! Let me work on it, give me a few minutes..." />}
              </div>
            </div>

            {/* Input */}
            <ChatInput 
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </>
        ) : (
          <WelcomeScreen 
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: Home,
})