import { Store } from '@tanstack/store'
import type { Message } from '../utils/ai'

// Types
export interface Prompt {
  id: string
  name: string
  content: string
  is_active: boolean
  created_at: number
}

export interface ScenarioInfo {
  scenarioName: string
  scenarioId?: string
  scenarioType?: string
  jsonData: any
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  scenarioInfo?: ScenarioInfo
  createdAt?: number
}

export interface State {
  prompts: Prompt[]
  conversations: Conversation[]
  currentConversationId: string | null
  isLoading: boolean
  selectedModel: string
}

const initialState: State = {
  prompts: [],
  conversations: [],
  currentConversationId: null,
  isLoading: false,
  selectedModel: 'claude-haiku-4-5-20251001'
}

export const store = new Store<State>(initialState)

export const actions = {
  // Prompt actions
  createPrompt: (name: string, content: string) => {
    const id = Date.now().toString()
    store.setState(state => {
      const updatedPrompts = state.prompts.map(p => ({ ...p, is_active: false }))
      return {
        ...state,
        prompts: [
          ...updatedPrompts,
          {
            id,
            name,
            content,
            is_active: true,
            created_at: Date.now()
          }
        ]
      }
    })
  },

  deletePrompt: (id: string) => {
    store.setState(state => ({
      ...state,
      prompts: state.prompts.filter(p => p.id !== id)
    }))
  },

  setPromptActive: (id: string, shouldActivate: boolean) => {
    store.setState(state => {
      if (shouldActivate) {
        return {
          ...state,
          prompts: state.prompts.map(p => ({
            ...p,
            is_active: p.id === id ? true : false
          }))
        };
      } else {
        return {
          ...state,
          prompts: state.prompts.map(p => ({
            ...p,
            is_active: p.id === id ? false : p.is_active
          }))
        };
      }
    });
  },

  // Chat actions
  setConversations: (conversations: Conversation[]) => {
    store.setState(state => ({ ...state, conversations }))
  },

  setCurrentConversationId: (id: string | null) => {
    store.setState(state => ({ ...state, currentConversationId: id }))
  },

  addConversation: (conversation: Conversation) => {
    store.setState(state => ({
      ...state,
      conversations: [...state.conversations, { ...conversation, createdAt: conversation.createdAt || Date.now() }],
      currentConversationId: conversation.id
    }))
  },

  updateConversationId: (oldId: string, newId: string) => {
    store.setState(state => ({
      ...state,
      conversations: state.conversations.map(conv =>
        conv.id === oldId ? { ...conv, id: newId } : conv
      ),
      currentConversationId: state.currentConversationId === oldId ? newId : state.currentConversationId
    }))
  },

  updateConversationTitle: (id: string, title: string) => {
    store.setState(state => ({
      ...state,
      conversations: state.conversations.map(conv =>
        conv.id === id ? { ...conv, title } : conv
      )
    }))
  },

  deleteConversation: (id: string) => {
    store.setState(state => ({
      ...state,
      conversations: state.conversations.filter(conv => conv.id !== id),
      currentConversationId: state.currentConversationId === id ? null : state.currentConversationId
    }))
  },

  addMessage: (conversationId: string, message: Message) => {
    store.setState(state => ({
      ...state,
      conversations: state.conversations.map(conv =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, message] }
          : conv
      )
    }))
  },

  // Helper to extract JSON from message content
  extractJsonFromMessage: (content: string): any => {
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
  },

  // Update scenario info when a scenario is generated
  updateScenarioInfo: (conversationId: string, message: Message) => {
    if (message.role === 'assistant') {
      const jsonData = actions.extractJsonFromMessage(message.content);
      if (jsonData && jsonData.scenarioName) {
        const scenarioInfo: ScenarioInfo = {
          scenarioName: jsonData.scenarioName,
          scenarioId: jsonData.scenarioId,
          scenarioType: jsonData.scenarioType,
          jsonData
        };
        
        store.setState(state => ({
          ...state,
          conversations: state.conversations.map(conv =>
            conv.id === conversationId
              ? { 
                  ...conv, 
                  scenarioInfo,
                  // Update title to scenario name
                  title: jsonData.scenarioName
                }
              : conv
          )
        }))
      }
    }
  },

  setLoading: (isLoading: boolean) => {
    store.setState(state => ({ ...state, isLoading }))
  },

  setSelectedModel: (model: string) => {
    store.setState(state => ({ ...state, selectedModel: model }))
  }
}

// Selectors
export const selectors = {
  getActivePrompt: (state: State) => state.prompts.find(p => p.is_active),
  getCurrentConversation: (state: State) => 
    state.conversations.find(c => c.id === state.currentConversationId),
  getPrompts: (state: State) => state.prompts,
  getConversations: (state: State) => state.conversations.sort((a, b) => {
    // Sort by creation time in descending order (newest first)
    const aTime = a.createdAt || 0;
    const bTime = b.createdAt || 0;
    return bTime - aTime;
  }),
  getCurrentConversationId: (state: State) => state.currentConversationId,
  getIsLoading: (state: State) => state.isLoading,
  getSelectedModel: (state: State) => state.selectedModel
} 