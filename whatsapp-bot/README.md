# SimChat WhatsApp Bot

A WhatsApp bot integration for SimChat that generates clinical simulation scenarios via conversational interface.

## Features

- 🤖 **Conversational AI** - Natural language scenario generation via WhatsApp
- 📱 **Group Chat Support** - Responds when @mentioned in WhatsApp groups
- 🔐 **Authentication** - One-time password protection
- 📄 **PDF Generation** - Server-side PDF rendering with embedded JSON
- 💾 **Database Sync** - Scenarios saved to sim.cool web app
- 🔄 **Persistent Context** - Multi-turn conversations with memory
- ⚡ **Real-time** - Immediate responses via Twilio webhooks

## Architecture

```
WhatsApp User → Twilio API → Express Webhook → Message Handler
                                                      ↓
                                              Anthropic Claude API
                                                      ↓
                                              Scenario Generator
                                                      ↓
                                              PDF Generator (Puppeteer)
                                                      ↓
                                              Convex Database
                                                      ↓
                                              Back to User via Twilio
```

## Prerequisites

- Node.js 18+
- Convex account and deployment
- Anthropic API key
- Twilio account with WhatsApp enabled
- Public URL for webhooks (ngrok for dev, cloud hosting for production)

## Installation

```bash
cd whatsapp-bot
npm install
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Fill in your credentials in `.env`:

```bash
# Convex (from main sim.cool app)
CONVEX_URL=https://your-app.convex.cloud
CONVEX_ADMIN_KEY=your-convex-admin-key

# Anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=+14155238886

# Authentication
WHATSAPP_AUTH_PASSWORD=YourSecurePassword123

# Server
PORT=3000
```

## Development

### Local Testing with ngrok

1. Start the bot:
```bash
npm run dev
```

2. In another terminal, start ngrok:
```bash
ngrok http 3000
```

3. Copy the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Configure Twilio webhook:
   - Go to Twilio Console → Messaging → WhatsApp Sandbox
   - Set webhook URL: `https://abc123.ngrok.io/webhook/whatsapp`
   - Method: `POST`
   - Save

5. Send a message to your Twilio WhatsApp number to test

## Production Deployment

### Option 1: Railway

1. Install Railway CLI:
```bash
npm install -g railway
```

2. Login and create project:
```bash
railway login
railway init
```

3. Set environment variables:
```bash
railway variables set CONVEX_URL=your-url
railway variables set ANTHROPIC_API_KEY=your-key
# ... set all other variables
```

4. Deploy:
```bash
railway up
```

5. Get deployment URL and configure Twilio webhook

### Option 2: Render

1. Create account at render.com
2. Create new "Web Service"
3. Connect Git repository
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables: Add all from `.env`
5. Deploy and use provided URL for Twilio webhook

### Option 3: Heroku

1. Install Heroku CLI and login:
```bash
heroku login
```

2. Create app:
```bash
heroku create simchat-whatsapp-bot
```

3. Set buildpacks for Puppeteer:
```bash
heroku buildpacks:add jontewks/puppeteer
heroku buildpacks:add heroku/nodejs
```

4. Set environment variables:
```bash
heroku config:set CONVEX_URL=your-url
heroku config:set ANTHROPIC_API_KEY=your-key
# ... set all other variables
```

5. Deploy:
```bash
git push heroku main
```

## Usage

### First-Time Authentication

1. Send any message to the WhatsApp bot
2. Bot will request authentication password
3. Send the password (from `WHATSAPP_AUTH_PASSWORD`)
4. Bot confirms authentication

### Generating Scenarios

Just describe what you need:
- "Create a sepsis scenario for junior nurses"
- "Generate a cardiac arrest simulation"
- "I need a respiratory distress case with 3 learning objectives"

### Commands

- `/help` - Show available commands
- `/new` or `/clear` - Start fresh conversation
- `/status` - Check authentication status

### Group Chats

The bot works in WhatsApp groups:
1. Add the bot to a group
2. @mention the bot with your request
3. Bot responds only when mentioned

## File Structure

```
whatsapp-bot/
├── src/
│   ├── index.js              # Express server & webhook
│   ├── auth.js               # Authentication logic
│   ├── convexClient.js       # Database operations
│   ├── messageHandler.js     # Main message routing
│   ├── scenarioGenerator.js  # AI scenario generation
│   ├── pdfGenerator.js       # Puppeteer PDF creation
│   ├── twilioClient.js       # WhatsApp messaging
│   ├── groupChatHandler.js   # Group chat @mention logic
│   └── defaultSystemPrompt.cjs # Scenario generation prompt
├── templates/
│   ├── preview.html          # PDF template (from main app)
│   └── ecg12/                # ECG rendering assets
├── package.json
├── .env.example
└── README.md
```

## Troubleshooting

### Puppeteer fails to launch

**Issue**: Browser launch errors in production

**Solution**: Ensure your hosting platform supports Puppeteer:
- Railway/Render: Works out of box
- Heroku: Requires puppeteer buildpack
- DigitalOcean: Install Chrome manually

Add these args to browser launch:
```javascript
args: ['--no-sandbox', '--disable-setuid-sandbox']
```

### PDF generation timeout

**Issue**: PDF takes too long to generate

**Solution**: Increase timeout in `pdfGenerator.js`:
```javascript
await page.waitForFunction(..., { timeout: 30000 });
```

### Twilio webhook fails

**Issue**: Webhook returns 500 error

**Solution**: 
1. Check logs for error details
2. Ensure CONVEX_URL and API keys are correct
3. Verify ngrok tunnel is active (dev)
4. Check Twilio webhook logs in console

### Messages not received

**Issue**: Bot doesn't respond to WhatsApp messages

**Solution**:
1. Verify webhook URL in Twilio console
2. Check webhook returns 200 OK quickly
3. Review server logs for errors
4. Ensure phone number format is correct (+country code)

## Security Considerations

1. **Password Protection**: Change `WHATSAPP_AUTH_PASSWORD` regularly
2. **Environment Variables**: Never commit `.env` file
3. **Webhook Validation**: Consider adding Twilio signature validation
4. **Rate Limiting**: Implement rate limits for production
5. **User Management**: Monitor authenticated users in Convex

## Cost Estimates

Per scenario generation:
- **Anthropic Claude Haiku**: ~$0.05-0.10 USD
- **Twilio WhatsApp**: $0.005 per message + $0.005 per media
- **Hosting**: $5-20/month depending on platform

## Maintenance

### Monitor Usage

Check Convex dashboard for:
- Number of users
- Active sessions
- Conversation count

Check Twilio console for:
- Message delivery rates
- Error logs
- Costs

### Update Models

To use a different Claude model:
```bash
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

### Clear Old Sessions

Run periodically to clean up inactive sessions (add as Convex cron):
```javascript
// In convex/crons.ts
export default crons({
  clearOldSessions: {
    schedule: "0 0 * * *", // Daily at midnight
    handler: async (ctx) => {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
      // Delete old inactive sessions
    }
  }
});
```

## Support

For issues or questions:
1. Check logs in your hosting dashboard
2. Review Twilio webhook logs
3. Check Convex dashboard for database errors
4. Refer to main sim.cool repository documentation

## License

Same as main sim.cool project
