# SimChat WhatsApp Integration

This document explains the WhatsApp bot integration added to SimChat.

## Overview

The WhatsApp bot allows users to generate clinical simulation scenarios through WhatsApp conversations. Generated scenarios are automatically synced to the main sim.cool web application.

## What Was Added

### Database Changes

**New Tables:**
- `users` - WhatsApp user authentication and profiles
- `whatsappSessions` - Conversation context for multi-turn interactions

**Updated Tables:**
- `conversations` - Added fields:
  - `source`: "web" | "whatsapp"
  - `userId`: Link to WhatsApp user
  - `isGroupChat`: Boolean flag
  - `whatsappGroupId`: WhatsApp group identifier

### New Convex Functions

**`convex/users.ts`:**
- `getByPhone` - Query user by phone number
- `isAuthenticated` - Check authentication status
- `upsertUser` - Create or update user
- `updateLastActive` - Update activity timestamp
- `revokeAuth` - Revoke authentication

**`convex/whatsappSessions.ts`:**
- `getSession` - Get session by phone number
- `addMessageToContext` - Add message to conversation history
- `clearSession` - Clear conversation context
- `deactivateSession` / `reactivateSession` - Manage session state

**Updated `convex/conversations.ts`:**
- `createFromWhatsApp` - Create conversation from WhatsApp
- `getByUser` - Query conversations by user
- `getBySource` - Query by source (web/whatsapp)

### WhatsApp Bot Service

New service in `/whatsapp-bot/`:
- Express server with Twilio webhooks
- Anthropic integration for scenario generation
- Puppeteer for server-side PDF generation
- Full conversation management
- Group chat support with @mentions

### UI Changes

**Sidebar badges:**
- WhatsApp conversations show green "WhatsApp" badge
- Group chat conversations show blue "Group" badge
- Maintains existing tag filtering functionality

## How It Works

```
User → WhatsApp → Twilio → Bot Server → Claude AI
                                  ↓
                            PDF Generator
                                  ↓
                            Convex Database ← sim.cool Web App
                                  ↓
                            Back to User
```

1. User sends message via WhatsApp
2. Twilio forwards to bot webhook
3. Bot authenticates user (one-time password)
4. Bot processes request with Claude AI
5. Scenario JSON generated
6. PDF created server-side with embedded JSON
7. Saved to Convex database
8. PDF sent back to user via WhatsApp
9. Appears in sim.cool web sidebar

## Key Features

✅ **Shared Database** - All scenarios accessible from web and WhatsApp
✅ **Persistent Context** - Multi-turn conversations
✅ **Group Chat Support** - Works in WhatsApp groups with @mentions
✅ **PDF Generation** - Same format as web app export
✅ **Authentication** - Password-protected access
✅ **Cost Tracking** - Same token/cost tracking as web

## Using the WhatsApp Bot

### First Time Setup

1. Send any message to the bot number
2. Receive authentication prompt
3. Reply with the password
4. Start requesting scenarios!

### Requesting Scenarios

Just describe what you need naturally:
- "Create a sepsis scenario"
- "I need a cardiac arrest simulation for experienced paramedics"
- "Generate a pediatric respiratory distress case"

### Group Chats

Add the bot to a WhatsApp group and @mention it:
```
@BotNumber create an anaphylaxis scenario
```

### Commands

- `/help` - Show help
- `/new` or `/clear` - Start fresh conversation
- `/status` - Check authentication

## Viewing WhatsApp Scenarios in Web App

WhatsApp-generated scenarios automatically appear in the sim.cool sidebar:
- Look for the green "WhatsApp" badge
- Group scenarios show additional blue "Group" badge
- Full conversation history available
- PDFs can be downloaded
- Can be edited/previewed like any scenario

## Development Setup

See `/whatsapp-bot/README.md` for detailed setup instructions.

Quick start:
```bash
cd whatsapp-bot
npm install
cp .env.example .env
# Fill in credentials
npm run dev
```

## Deployment

See `/whatsapp-bot/DEPLOYMENT.md` for complete deployment guide.

Recommended platforms:
- Railway (easiest)
- Render
- Heroku

## Architecture Decisions

### Why Separate Service?

The WhatsApp bot is a separate Node.js service because:
1. Requires always-running server for webhooks
2. Puppeteer dependency (large, requires Chrome)
3. Different scaling needs than web app
4. Simpler to deploy to webhook-friendly platforms

### Why Server-Side PDF?

- WhatsApp requires actual file delivery (not browser-based)
- Consistent with web app's preview.html
- Embeds JSON for round-trip compatibility

### Why Shared Database?

- Single source of truth
- Scenarios accessible everywhere
- No sync complexity
- Unified user experience

## Maintenance

### Regular Tasks

1. Monitor Twilio webhook logs
2. Check Convex for user growth
3. Review API costs (Anthropic)
4. Update models as needed

### Updating

To update bot code:
1. Make changes in `/whatsapp-bot/`
2. Test locally with ngrok
3. Deploy to production
4. Monitor logs

To update system prompt:
1. Update `/src/shared/defaultSystemPrompt.cjs`
2. Copy to `/whatsapp-bot/src/defaultSystemPrompt.cjs`
3. Redeploy bot

## Cost Estimates

Per scenario:
- Anthropic API: ~$0.05-0.10
- Twilio WhatsApp: ~$0.01
- Hosting: $5-20/month unlimited

## Security

- Password authentication required
- Bcrypt hashed storage
- Twilio webhook validation available
- Convex admin key secured
- No public scenario access

## Troubleshooting

**Bot doesn't respond:**
- Check webhook URL in Twilio
- Verify environment variables
- Check server logs

**PDF generation fails:**
- Ensure Puppeteer dependencies installed
- Check memory limits (512MB minimum)
- Review PDF generation timeout settings

**Scenarios not appearing in web:**
- Verify Convex URL matches
- Check user ID association
- Review conversation creation logs

## Future Enhancements

Potential improvements:
- Voice message scenario requests
- Image-based scenario generation
- Collaborative scenario editing
- Scenario templates library
- Usage analytics dashboard

## Support

For issues:
1. Check logs in hosting dashboard
2. Review Twilio webhook logs
3. Check Convex dashboard
4. Refer to README and DEPLOYMENT guides
