import 'dotenv/config';
import express from 'express';
import { handleIncomingMessage } from './messageHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    service: 'SimChat WhatsApp Bot',
    status: 'running',
    version: '1.0.0',
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const { From, Body, WaId, ProfileName, GroupId } = req.body;
    
    console.log('\n--- Incoming WhatsApp Message ---');
    console.log('From:', From);
    console.log('Body:', Body);
    console.log('Profile:', ProfileName);
    console.log('Group ID:', GroupId || 'N/A');
    console.log('--------------------------------\n');
    
    res.status(200).send('OK');
    
    handleIncomingMessage(From, Body, GroupId, ProfileName).catch(error => {
      console.error('Error handling message:', error);
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/webhook/whatsapp/status', (req, res) => {
  console.log('Message status update:', req.body);
  res.status(200).send('OK');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`\n🚀 SimChat WhatsApp Bot started`);
  console.log(`📱 Listening on port ${PORT}`);
  console.log(`🌐 Webhook URL: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`\n✅ Ready to receive WhatsApp messages!\n`);
});
