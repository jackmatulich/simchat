import { ConvexHttpClient } from 'convex/browser';

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

  convexClient = new ConvexHttpClient(convexUrl);
  convexClient.setAdminAuth(convexAdminKey);
  return convexClient;
}

export function normalizePhoneNumber(from) {
  return String(from || '')
    .replace(/^whatsapp:/, '')
    .trim();
}

export async function getUser(phoneNumber) {
  const convex = getConvexClient();
  return await convex.query('users:getByPhone', { phoneNumber });
}

export async function isUserAuthenticated(phoneNumber) {
  const convex = getConvexClient();
  return await convex.query('users:isAuthenticated', { phoneNumber });
}

export async function createOrUpdateUser(phoneNumber, passwordHash, displayName) {
  const convex = getConvexClient();
  return await convex.mutation('users:upsertUser', {
    phoneNumber,
    passwordHash,
    displayName,
  });
}

export async function updateUserLastActive(phoneNumber) {
  const convex = getConvexClient();
  return await convex.mutation('users:updateLastActive', { phoneNumber });
}

export async function getSession(phoneNumber) {
  const convex = getConvexClient();
  return await convex.query('whatsappSessions:getSession', { phoneNumber });
}

export async function addMessageToSession(phoneNumber, role, content) {
  const convex = getConvexClient();
  return await convex.mutation('whatsappSessions:addMessageToContext', {
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
  return await convex.mutation('whatsappSessions:clearSession', { phoneNumber });
}

export async function createWhatsAppConversation(title, userId, message, isGroupChat, whatsappGroupId) {
  const convex = getConvexClient();
  return await convex.mutation('conversations:createFromWhatsApp', {
    title,
    userId,
    message,
    isGroupChat: isGroupChat || false,
    whatsappGroupId,
  });
}

export async function uploadPdfAndGetUrl(pdfBuffer, filename = 'scenario.pdf') {
  const convex = getConvexClient();
  const uploadUrl = await convex.mutation('files:generateUploadUrl', {});
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf' },
    body: blob,
  });
  if (!response.ok) {
    throw new Error(`Failed to upload PDF (${response.status})`);
  }
  const { storageId } = await response.json();
  const url = await convex.query('files:getUrl', { storageId });
  if (!url) {
    throw new Error('Failed to resolve uploaded PDF URL');
  }
  return { storageId, url, filename };
}
