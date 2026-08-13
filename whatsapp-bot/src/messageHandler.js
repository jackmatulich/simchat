import { handleAuthenticationFlow, checkAuthentication } from './auth.js';
import { 
  getUser,
  updateUserLastActive,
  addMessageToSession,
  clearUserSession,
  createWhatsAppConversation,
  uploadPdfAndGetUrl,
} from './convexClient.js';
import { sendTextMessage, sendPDFMessage, sendTypingIndicator } from './twilioClient.js';
import { generateScenario, extractScenarioJson, isScenarioRequest } from './scenarioGenerator.js';
import { generateScenarioPDF, generateScenarioTitle } from './pdfGenerator.js';
import { 
  extractMentions, 
  shouldProcessGroupMessage, 
  cleanMessageFromMentions,
  isGroupChat as checkIsGroupChat,
} from './groupChatHandler.js';

export async function handleIncomingMessage(from, body, groupId, profileName) {
  const isGroupChat = checkIsGroupChat(groupId);
  const mentions = isGroupChat ? extractMentions(body) : [];
  
  if (isGroupChat && !shouldProcessGroupMessage(mentions)) {
    console.log(`Ignoring group message - bot not mentioned`);
    return;
  }
  
  const cleanBody = isGroupChat ? cleanMessageFromMentions(body) : body;
  
  console.log(`Processing message from ${from}: ${cleanBody.substring(0, 50)}...`);
  
  const isAuthenticated = await checkAuthentication(from);
  
  if (!isAuthenticated) {
    return await handleAuthentication(from, cleanBody, profileName);
  }
  
  await updateUserLastActive(from);
  
  if (cleanBody.startsWith('/')) {
    return await handleCommand(from, cleanBody);
  }
  
  if (isScenarioRequest(cleanBody)) {
    return await handleScenarioGeneration(from, cleanBody, groupId, profileName);
  }
  
  return await handleGeneralChat(from, cleanBody);
}

async function handleAuthentication(from, message, profileName) {
  const result = await handleAuthenticationFlow(from, message, profileName);
  
  if (result.message) {
    await sendTextMessage(from, result.message);
  }
  
  return result;
}

async function handleCommand(from, command) {
  const cmd = command.toLowerCase().trim();
  
  if (cmd === '/help') {
    const helpText = `
📋 *SimChat WhatsApp Bot Commands*

*Scenario Generation:*
Just describe what you need! For example:
• "Create a sepsis scenario"
• "Generate a cardiac arrest simulation"
• "I need a respiratory distress case"

*Commands:*
/help - Show this help message
/new - Start a new conversation
/clear - Clear conversation history
/status - Check your authentication status

*Tips:*
• Be specific about the clinical situation
• Mention learning objectives if needed
• The bot works in group chats when you @mention it
    `.trim();
    
    await sendTextMessage(from, helpText);
    return;
  }
  
  if (cmd === '/new' || cmd === '/clear') {
    await clearUserSession(from);
    await sendTextMessage(from, '✅ Conversation cleared. Ready for a new scenario!');
    return;
  }
  
  if (cmd === '/status') {
    const user = await getUser(from);
    if (user) {
      const statusText = `
✅ *Status: Authenticated*
📱 Phone: ${user.phoneNumber}
👤 Name: ${user.displayName || 'Not set'}
📅 Active: ${new Date(user.lastActiveAt).toLocaleString()}
      `.trim();
      await sendTextMessage(from, statusText);
    } else {
      await sendTextMessage(from, '❌ Not authenticated. Please provide password.');
    }
    return;
  }
  
  await sendTextMessage(from, `❓ Unknown command: ${command}\n\nType /help for available commands.`);
}

async function handleScenarioGeneration(from, message, groupId, profileName) {
  try {
    await sendTypingIndicator(from);
    
    await addMessageToSession(from, 'user', message);
    
    console.log('Generating scenario with AI...');
    const response = await generateScenario(from, message);
    
    const scenarioJson = extractScenarioJson(response.content);
    
    if (!scenarioJson) {
      await addMessageToSession(from, 'assistant', response.content);
      await sendTextMessage(from, response.content);
      return;
    }
    
    await addMessageToSession(from, 'assistant', response.content);
    
    console.log('Generating PDF...');
    const pdfBuffer = await generateScenarioPDF(scenarioJson);
    
    const user = await getUser(from);
    const scenarioTitle = generateScenarioTitle(scenarioJson);
    
    const assistantMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: response.content,
      model: response.model,
      inputTokens: response.costs.inputTokens,
      outputTokens: response.costs.outputTokens,
      costUsd: response.costs.costUsd,
      costAud: response.costs.costAud,
      exchangeRateAudPerUsd: response.costs.exchangeRateAudPerUsd,
    };
    
    console.log('Saving to Convex...');
    await createWhatsAppConversation(
      scenarioTitle,
      user._id,
      assistantMessage,
      !!groupId,
      groupId
    );
    
    const caption = `✅ *${scenarioTitle}*\n\nYour scenario is ready! This PDF has been saved to your sim.cool history.\n\nRequest another scenario anytime!`;
    
    console.log('Uploading PDF and sending via WhatsApp...');
    const uploaded = await uploadPdfAndGetUrl(pdfBuffer, `${scenarioJson.scenarioId || 'scenario'}.pdf`);
    await sendPDFMessage(from, uploaded.url, caption);
    
    console.log('Scenario generation complete');
    
  } catch (error) {
    console.error('Error in scenario generation:', error);
    await sendTextMessage(
      from,
      '❌ Sorry, there was an error generating your scenario. Please try again or contact support.'
    );
  }
}

async function handleGeneralChat(from, message) {
  try {
    await addMessageToSession(from, 'user', message);
    
    const response = await generateScenario(from, message);
    
    await addMessageToSession(from, 'assistant', response.content);
    
    await sendTextMessage(from, response.content);
    
  } catch (error) {
    console.error('Error in general chat:', error);
    await sendTextMessage(
      from,
      '❌ Sorry, I encountered an error. Please try again.'
    );
  }
}
