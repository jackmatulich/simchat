# WhatsApp Bot Integration - Your TODO List

This is your action list for completing the WhatsApp bot integration. I've implemented all the code and infrastructure. You need to handle the third-party service setup and deployment.

---

## ✅ What's Already Done (By Me)

- [x] Database schema updated with users and whatsappSessions tables
- [x] New Convex functions for user and session management
- [x] Complete WhatsApp bot service created
- [x] Authentication system implemented
- [x] PDF generation with Puppeteer
- [x] Twilio integration code
- [x] Group chat support
- [x] Web UI updated with badges
- [x] All documentation written
- [x] Code committed and pushed
- [x] Pull request created (#1)

---

## 🔴 What You Need to Do

### 1. Review and Merge Pull Request

**Estimated Time: 10 minutes**

- [ ] Go to: https://github.com/jackmatulich/simchat/pull/1
- [ ] Review the changes (1100+ lines added)
- [ ] Check the documentation files
- [ ] Merge the PR when ready
- [ ] Pull changes locally: `git pull origin main`

---

### 2. Deploy Convex Schema Changes

**Estimated Time: 5 minutes**

The new database tables need to be deployed to your Convex instance.

- [ ] Make sure you're in the main project directory
- [ ] Run: `npx convex dev` (for dev environment)
- [ ] OR Run: `npx convex deploy` (for production)
- [ ] Verify new tables appear in Convex dashboard:
  - `users` table
  - `whatsappSessions` table
  - Updated `conversations` table with new fields

**How to verify:**
1. Go to https://dashboard.convex.dev
2. Select your project
3. Click "Data" tab
4. You should see 3 tables: conversations, users, whatsappSessions

---

### 3. Set Up Twilio Account

**Estimated Time: 15-30 minutes**

#### Option A: WhatsApp Sandbox (Quick Testing)

- [ ] Go to: https://console.twilio.com
- [ ] Create account (if needed)
- [ ] Navigate to: **Messaging** → **Try it out** → **Send a WhatsApp message**
- [ ] Note the sandbox number (e.g., +1-415-523-8886)
- [ ] Note the join code (e.g., "join example-word")
- [ ] From your phone, send the join code to the sandbox number
- [ ] Confirm you've joined the sandbox

#### Option B: WhatsApp Business API (Production - Takes 1-2 Weeks)

- [ ] Go to Twilio Console → **Messaging** → **WhatsApp**
- [ ] Click **Get Started** for WhatsApp Business API
- [ ] Complete business verification form
- [ ] Wait for approval (typically 1-2 weeks)
- [ ] Once approved, configure your WhatsApp number

#### Get Credentials

- [ ] From Twilio Console homepage, copy:
  - **Account SID** (starts with `AC...`)
  - **Auth Token** (click eye icon to reveal)
- [ ] Save these - you'll need them for deployment

---

### 4. Deploy WhatsApp Bot Service

**Estimated Time: 20-30 minutes**

Choose ONE hosting platform:

#### Option A: Railway (Recommended - Easiest)

- [ ] Install Railway CLI: `npm install -g railway`
- [ ] Login: `railway login`
- [ ] Navigate to bot directory: `cd whatsapp-bot`
- [ ] Initialize project: `railway init`
  - Create new project
  - Name it "simchat-whatsapp-bot"
- [ ] Set environment variables (see below)
- [ ] Deploy: `railway up`
- [ ] Get URL: `railway domain` (create if needed)
- [ ] Copy the deployment URL (e.g., `https://simchat-whatsapp-bot.up.railway.app`)

#### Option B: Render

- [ ] Go to: https://render.com
- [ ] Create account
- [ ] Click **New** → **Web Service**
- [ ] Connect your GitHub repo
- [ ] Configure:
  - Root Directory: `whatsapp-bot`
  - Build Command: `npm install`
  - Start Command: `npm start`
- [ ] Add environment variables (see below)
- [ ] Click **Create Web Service**
- [ ] Wait for deployment (5-10 minutes)
- [ ] Copy the service URL

#### Option C: Heroku

- [ ] Install Heroku CLI
- [ ] Run: `heroku login`
- [ ] Create app: `heroku create simchat-whatsapp-bot`
- [ ] Add buildpacks:
  ```bash
  heroku buildpacks:add jontewks/puppeteer
  heroku buildpacks:add heroku/nodejs
  ```
- [ ] Set environment variables (see below)
- [ ] Deploy: `git push heroku main`
- [ ] Copy the app URL

#### Environment Variables to Set

Set ALL of these in your chosen platform:

```bash
CONVEX_URL=https://your-app.convex.cloud
CONVEX_ADMIN_KEY=your-convex-admin-key
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
ANTHROPIC_MAX_OUTPUT_TOKENS=32000
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=+14155238886
WHATSAPP_AUTH_PASSWORD=ChooseSecurePassword123
PORT=3000
USD_TO_AUD_RATE=1.55
```

**Where to find values:**
- `CONVEX_URL` - From your Convex dashboard
- `CONVEX_ADMIN_KEY` - Convex dashboard → Settings → API Keys
- `ANTHROPIC_API_KEY` - Same as your web app uses
- `TWILIO_*` - From Twilio console (step 3)
- `WHATSAPP_AUTH_PASSWORD` - Choose a secure password!

---

### 5. Configure Twilio Webhook

**Estimated Time: 5 minutes**

Connect Twilio to your deployed bot:

- [ ] Go to Twilio Console
- [ ] Navigate to: **Messaging** → **Settings** → **WhatsApp Sandbox Settings**
  (or for production: **WhatsApp Senders** → your number)
- [ ] Set webhook URL:
  ```
  https://your-deployment-url.com/webhook/whatsapp
  ```
  Replace `your-deployment-url.com` with your actual URL from step 4
- [ ] Method: **POST**
- [ ] Content Type: **application/x-www-form-urlencoded**
- [ ] (Optional) Status callback:
  ```
  https://your-deployment-url.com/webhook/whatsapp/status
  ```
- [ ] Click **Save**

---

### 6. Test the Integration

**Estimated Time: 10 minutes**

#### Test 1: Basic Connection

- [ ] Open your deployed bot URL in browser (e.g., `https://your-bot.railway.app`)
- [ ] Should see: `{ "service": "SimChat WhatsApp Bot", "status": "running" }`
- [ ] Try health endpoint: `https://your-bot.railway.app/health`
- [ ] Should return: `{ "status": "healthy", ... }`

#### Test 2: Authentication

- [ ] Open WhatsApp on your phone
- [ ] Send message to Twilio number: "Hi"
- [ ] Should receive: "Welcome! Please provide the authentication password."
- [ ] Reply with your `WHATSAPP_AUTH_PASSWORD`
- [ ] Should receive: "✅ Authentication successful! You can now request clinical scenarios."

#### Test 3: Scenario Generation

- [ ] Send: "Create a sepsis scenario for junior nurses"
- [ ] Should receive: "⏳ Generating your scenario..."
- [ ] Wait 10-30 seconds
- [ ] Should receive: PDF file with scenario
- [ ] Check sim.cool web app sidebar - scenario should appear with green "WhatsApp" badge

#### Test 4: Commands

- [ ] Send: `/help`
- [ ] Should receive: Help message with commands
- [ ] Send: `/status`
- [ ] Should receive: Your authentication status
- [ ] Send: `/clear`
- [ ] Should receive: Confirmation of cleared conversation

#### Test 5: Group Chat (Optional)

- [ ] Create WhatsApp group
- [ ] Add bot number to group
- [ ] Send message: "@BotNumber create a cardiac arrest scenario"
- [ ] Bot should respond only when mentioned
- [ ] Check web app - should show blue "Group" badge

---

### 7. Monitor and Verify

**Estimated Time: 5 minutes**

- [ ] Check bot logs (Railway/Render/Heroku dashboard)
- [ ] Verify no errors in logs
- [ ] Check Twilio Console → Monitor → Logs
- [ ] Verify messages delivered successfully
- [ ] Check Convex dashboard → Data
- [ ] Verify new users and conversations appear
- [ ] Check costs in Twilio and Anthropic dashboards

---

## 🚨 Troubleshooting Guide

### Bot doesn't respond to WhatsApp messages

**Check:**
1. Is bot deployed and running? (Check health endpoint)
2. Is webhook URL correct in Twilio?
3. Are all environment variables set?
4. Check bot logs for errors

### "Failed to launch browser" error

**Solution:**
- Railway/Render: Should work automatically
- Heroku: Make sure puppeteer buildpack is added BEFORE nodejs buildpack

### PDF generation timeout

**Solution:**
- Increase timeout in pdfGenerator.js (line ~35)
- Or upgrade hosting plan for more memory/CPU

### Scenarios not appearing in web UI

**Check:**
1. Convex schema deployed?
2. CONVEX_URL matches between bot and web app?
3. Check Convex logs for errors
4. Verify conversation was created (check Convex Data tab)

### "Missing API key" errors

**Solution:**
- Double-check all environment variables are set
- Restart the bot service after setting variables
- Verify no typos in variable names

---

## 📊 Cost Breakdown

**Monthly Costs (estimated for ~100 scenarios/month):**

| Service | Cost |
|---------|------|
| Anthropic API | ~$5-10 |
| Twilio WhatsApp | ~$1-2 |
| Hosting (Railway/Render) | $5-10 |
| **Total** | **~$11-22/month** |

**Per scenario:**
- Anthropic: ~$0.05-0.10
- Twilio: ~$0.01
- Total: ~$0.06-0.11 per scenario

---

## 🎉 Success Criteria

You're done when:

- [x] PR merged
- [x] Convex schema deployed with 3 tables
- [x] Bot deployed and accessible at public URL
- [x] Twilio webhook configured
- [x] You can authenticate via WhatsApp
- [x] You can generate a scenario and receive PDF
- [x] Scenario appears in web app with "WhatsApp" badge
- [x] No errors in logs
- [x] Cost monitoring configured

---

## 📚 Reference Documentation

I've created these docs for you:

1. **Setup Guide**: `whatsapp-bot/README.md`
2. **Deployment Guide**: `whatsapp-bot/DEPLOYMENT.md`
3. **Integration Overview**: `WHATSAPP_INTEGRATION.md`

---

## ⏱️ Total Time Estimate

- Setup: 1-2 hours
- Testing: 30 minutes
- Troubleshooting buffer: 30 minutes
- **Total: 2-3 hours**

(Excluding WhatsApp Business API approval if needed)

---

## 🆘 Need Help?

If you get stuck:

1. Check the error in logs first
2. Review the relevant documentation file
3. Check Twilio webhook logs in console
4. Verify all environment variables are set correctly
5. Try redeploying the bot service

Common issues and solutions are documented in:
- `whatsapp-bot/README.md` (Troubleshooting section)
- `whatsapp-bot/DEPLOYMENT.md` (Troubleshooting section)

---

## ✉️ Sharing with Users

Once everything works, share:

1. **WhatsApp bot number** (your Twilio number)
2. **Authentication password** (from `WHATSAPP_AUTH_PASSWORD`)
3. **Quick start instructions:**
   - Send "Hi" to authenticate
   - Send password when prompted
   - Request scenarios naturally
   - Use `/help` for commands

---

Good luck! The hard part (code implementation) is done. You just need to wire up the services. 🚀
