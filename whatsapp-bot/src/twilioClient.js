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

export async function sendTextMessage(to, body) {
  const client = getTwilioClient();
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  
  if (!from) {
    throw new Error('Missing TWILIO_WHATSAPP_NUMBER');
  }
  
  try {
    const message = await client.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${to}`,
      body,
    });
    
    console.log(`Message sent to ${to}: ${message.sid}`);
    return message;
  } catch (error) {
    console.error('Error sending text message:', error);
    throw error;
  }
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
