# Netlify Function Timeout Solution

## Problem
Your SimChat application was experiencing timeout issues when requesting AI responses from Anthropic's API. The TanStack Start server functions were timing out after 10-30 seconds, which wasn't enough time for complex AI responses.

## Solution
We've implemented a solution using Netlify Background Functions, which can run for up to 15 minutes (900 seconds), providing ample time for AI responses.

## Changes Made

### 1. Updated `netlify.toml`
- Added function configuration with extended timeout (900 seconds)
- Set up proper redirects for the API endpoint
- Configured function directory and bundler

### 2. Created Netlify Function
- **Location**: `netlify/functions/genAIResponse.js`
- **Features**:
  - Uses non-streaming Anthropic API calls to avoid timeout issues
  - Proper CORS handling
  - Error handling with specific error messages
  - Extended timeout configuration (2 minutes for API calls)

### 3. Updated Client Code
- **File**: `src/utils/ai.ts`
- **Changes**:
  - Replaced TanStack Start server function with Netlify function call
  - Updated endpoint to `/.netlify/functions/genAIResponse`
  - Maintained streaming compatibility by simulating chunks
  - Removed legacy server function code

### 4. Dependencies
- Created `netlify/functions/package.json` with required dependencies
- Uses `@anthropic-ai/sdk` for API calls
- Includes `@types/node` for TypeScript support

## How It Works

1. **Client Request**: The frontend sends a POST request to `/.netlify/functions/genAIResponse`
2. **Netlify Function**: The function processes the request and calls Anthropic's API
3. **Response**: The function returns the complete AI response
4. **Streaming Simulation**: The client simulates streaming by chunking the response

## Benefits

- **Extended Timeout**: 15 minutes vs 30 seconds
- **Better Reliability**: No more timeout errors for complex scenarios
- **Maintained UX**: Streaming simulation preserves user experience
- **Scalable**: Can handle longer, more complex AI responses

## Deployment

1. Ensure your `ANTHROPIC_API_KEY` is set in Netlify environment variables
2. Deploy to Netlify - the functions will be automatically built and deployed
3. The function will be available at `/.netlify/functions/genAIResponse`

## Testing

To test locally:
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run: `netlify dev`
3. The function will be available at `http://localhost:8888/.netlify/functions/genAIResponse`

## Troubleshooting

- **Function not found**: Ensure the function is in the correct directory (`netlify/functions/`)
- **API key errors**: Check that `ANTHROPIC_API_KEY` is set in Netlify environment variables
- **CORS issues**: The function includes proper CORS headers for cross-origin requests
- **Timeout still occurring**: Check function logs in Netlify dashboard for detailed error information 