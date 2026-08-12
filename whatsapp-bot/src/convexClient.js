import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api.js';

let convexClient = null;

export function getConvexClient() {
  if (convexClient) return convexClient;
  
  const convexUrl = process.env.CONVEX_URL;
  const convexAdminKey = process.env.CONVEX_ADMIN_KEY;
  
  if (!convexUrl || !convexAdminKey) {
    throw new Error('Missing CONVEX_URL or CONVEX_ADMIN_KEY in environment variables');
  }
  
  if (!convexUrl.endsWith('.convex.cloud')) {
    throw new Error('CONVEX_URL must end with .convex.cloud');
  }
  
  convexClient = new ConvexHttpClient(convexUrl, { adminKey: convexAdminKey });
  return convexClient;
}

// User operations
export async function getUser(phoneNumber) {
  const convex = getConvexClient();
  return await convex.query(api.users.getByPhone, { phoneNumber });
}

export async function isUserAuthenticated(phoneNumber) {
  const convex = getConvexClient();
  return await convex.query(api.users.isAuthenticated, { phoneNumber });
}

export async function createOrUpdateUser(phoneNumber, passwordHash, displayName) {
  const convex = getConvexClient();
  return await convex.mutation(api.users.upsertUser, {
    phoneNumber,
    passwordHash,
    displayName,
  });
}

export async function updateUserLastActive(phoneNumber) {
  const convex = getConvexClient();
  return await convex.mutation(api.users.updateLastActive, { phoneNumber });
}

// Session operations
export async function getSession(phoneNumber) {
  const convex = getConvexClient();
  return await convex.query(api.whatsappSessions.getSession, { phoneNumber });
}

export async function addMessageToSession(phoneNumber, role, content) {
  const convex = getConvexClient();
  return await convex.mutation(api.whatsappSessions.addMessageToContext, {
    phoneNumber,
    message: {
      role,
      content,
      timestamp: Date.now(),
    },
  });
}

export async function clearUserSession(phoneNumber) {
  const convex = getConvexClient();
  return await convex.mutation(api.whatsappSessions.clearSession, { phoneNumber });
}

// Conversation operations
export async function createConversation(title, messages) {
  const convex = getConvexClient();
  return await convex.mutation(api.conversations.create, {
    title,
    messages: messages || [],
  });
}

export async function createWhatsAppConversation(title, userId, message, isGroupChat, whatsappGroupId) {
  const convex = getConvexClient();
  return await convex.mutation(api.conversations.createFromWhatsApp, {
    title,
    userId,
    message,
    isGroupChat: isGroupChat || false,
    whatsappGroupId,
  });
}

export async function addMessageToConversation(conversationId, message) {
  const convex = getConvexClient();
  return await convex.mutation(api.conversations.addMessage, {
    conversationId,
    message,
  });
}

export async function getConversationsByUser(userId) {
  const convex = getConvexClient();
  return await convex.query(api.conversations.getByUser, { userId });
}
