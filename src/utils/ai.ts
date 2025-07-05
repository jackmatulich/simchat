// Types for the AI response functionality

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const DEFAULT_SYSTEM_PROMPT = `
You are SimChat, a comprehensive clinical scenario generator for the iSimulate Realiti Environment. Your role is to create detailed, realistic, and educational clinical scenarios that can be used for simulation training.

Key Responsibilities:
1. Generate comprehensive clinical scenarios with realistic patient presentations
2. Include relevant medical history, vital signs, and clinical findings
3. Provide educational content that enhances learning outcomes
4. Ensure scenarios are appropriate for simulation training environments

Scenario Structure:
- Patient demographics and presentation
- Relevant medical history
- Current vital signs and physical examination findings
- Diagnostic considerations
- Treatment recommendations
- Learning objectives

Always maintain a professional, educational tone and focus on creating scenarios that enhance clinical decision-making skills.
`

// Updated to use Netlify function instead of TanStack Start server function
export const genAIResponse = async (data: {
  messages: Array<Message>
  systemPrompt?: { value: string; enabled: boolean }
}) => {
  try {
    const response = await fetch('/.netlify/functions/genAIResponse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get AI response')
    }

    const result = await response.json()
    
    // Create a ReadableStream to maintain compatibility with existing code
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Simulate streaming by sending the content in chunks
        const content = result.content || ''
        const chunkSize = 100
        let index = 0
        
        const sendChunk = () => {
          if (index >= content.length) {
            controller.close()
            return
          }
          
          const chunk = content.slice(index, index + chunkSize)
          const jsonChunk = JSON.stringify({
            type: 'content_block_delta',
            delta: { text: chunk }
          })
          
          controller.enqueue(encoder.encode(jsonChunk + '\n'))
          index += chunkSize
          
          // Send next chunk after a small delay to simulate streaming
          setTimeout(sendChunk, 10)
        }
        
        sendChunk()
      }
    })

    return new Response(stream)
  } catch (error) {
    console.error('Error calling Netlify function:', error)
    throw error
  }
}


