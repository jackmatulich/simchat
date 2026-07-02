// Types for the AI response functionality

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  costUsd?: number
  costAud?: number
  exchangeRateAudPerUsd?: number
}

// Updated to use Netlify function instead of TanStack Start server function
export const genAIResponse = async (data: {
  messages: Array<Message>
  systemPrompt?: { value: string; enabled: boolean }
  conversationId: string
  model?: string
}) => {
  try {
    const response = await fetch('/.netlify/functions/genAIResponse-background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (response.status === 202) {
      // Background function accepted, response will appear in Convex
      return;
    }

    if (!response.ok) {
      let errorMsg = 'Failed to queue AI response';
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object' && 'error' in errorData) {
          errorMsg = errorData.error;
        }
      } catch {}
      throw new Error(errorMsg);
    }

    // For non-background (should not happen), just return
    return;
  } catch (error) {
    console.error('Error calling Netlify function:', error)
    throw error
  }
}


