export function extractMentions(messageBody) {
  const mentionRegex = /@\[(\+\d+)\]/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(messageBody)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

export function shouldProcessGroupMessage(mentions) {
  const botNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  
  if (!botNumber) {
    return false;
  }
  
  const cleanBotNumber = botNumber.replace(/\D/g, '');
  
  return mentions.some(mention => {
    const cleanMention = mention.replace(/\D/g, '');
    return cleanMention === cleanBotNumber || cleanMention.endsWith(cleanBotNumber);
  });
}

export function cleanMessageFromMentions(messageBody) {
  return messageBody.replace(/@\[\+\d+\]/g, '').trim();
}

export function isGroupChat(groupId) {
  return !!groupId;
}
