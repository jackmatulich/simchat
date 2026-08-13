import twilio from 'twilio';

let twilioClient = null;

export function getTwilioClient() {
  if (twilioClient) return twilioClient;
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
  }
  
  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

const WHATSAPP_TEXT_LIMIT = 1500;

export async function sendTextMessage(to, body) {
  const client = getTwilioClient();
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!from) {
    throw new Error('Missing TWILIO_WHATSAPP_NUMBER');
  }

  const text = String(body || '').trim() || ' ';
  const chunks = [];
  for (let i = 0; i < text.length; i += WHATSAPP_TEXT_LIMIT) {
    chunks.push(text.slice(i, i + WHATSAPP_TEXT_LIMIT));
  }

  let lastMessage = null;
  for (const chunk of chunks.slice(0, 3)) {
    lastMessage = await client.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${to}`,
      body: chunk,
    });
    console.log(`Message sent to ${to}: ${lastMessage.sid}`);
  }
  return lastMessage;
}

export async function sendPDFMessage(to, mediaUrl, caption) {
  const client = getTwilioClient();
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!from) {
    throw new Error('Missing TWILIO_WHATSAPP_NUMBER');
  }

  try {
    const message = await client.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${to}`,
      body: caption,
      mediaUrl: [mediaUrl],
    });

    console.log(`PDF sent to ${to}: ${message.sid}`);
    return message;
  } catch (error) {
    console.error('Error sending PDF message:', error);
    await sendTextMessage(
      to,
      'Sorry, there was an error sending the PDF. The scenario has been saved to your history on sim.cool',
    );
    throw error;
  }
}

export async function sendTypingIndicator(to) {
  try {
    await sendTextMessage(to, '⏳ Generating your scenario...');
  } catch (error) {
    console.error('Error sending typing indicator:', error);
  }
}
