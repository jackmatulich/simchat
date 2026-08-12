import bcrypt from 'bcrypt';
import { getUser, createOrUpdateUser, isUserAuthenticated } from './convexClient.js';

const SALT_ROUNDS = 10;

export async function verifyPassword(providedPassword) {
  const correctPassword = process.env.WHATSAPP_AUTH_PASSWORD;
  
  if (!correctPassword) {
    throw new Error('WHATSAPP_AUTH_PASSWORD not set in environment');
  }
  
  return providedPassword.trim() === correctPassword;
}

export async function authenticateUser(phoneNumber, password, displayName) {
  const isValid = await verifyPassword(password);
  
  if (!isValid) {
    return { success: false, message: '❌ Invalid password. Access denied.' };
  }
  
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  try {
    const userId = await createOrUpdateUser(phoneNumber, passwordHash, displayName);
    return {
      success: true,
      userId,
      message: '✅ Authentication successful! You can now request clinical scenarios.',
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      message: '❌ Error during authentication. Please try again.',
    };
  }
}

export async function checkAuthentication(phoneNumber) {
  try {
    return await isUserAuthenticated(phoneNumber);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

export async function handleAuthenticationFlow(phoneNumber, message, displayName) {
  const user = await getUser(phoneNumber);
  
  if (!user) {
    if (isGreeting(message)) {
      return {
        needsAuth: true,
        message: '👋 Welcome to SimChat! To get started, please provide the authentication password.',
      };
    }
    
    return await authenticateUser(phoneNumber, message, displayName);
  }
  
  if (!user.isAuthenticated) {
    return await authenticateUser(phoneNumber, message, displayName);
  }
  
  return { success: true, authenticated: true, userId: user._id };
}

function isGreeting(message) {
  const greetings = ['hi', 'hello', 'hey', 'start', 'begin', 'help'];
  const lowerMsg = message.toLowerCase().trim();
  return greetings.some(g => lowerMsg === g || lowerMsg.startsWith(g + ' '));
}
