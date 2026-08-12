# WhatsApp Bot Deployment Guide

This guide walks through deploying the SimChat WhatsApp bot to production.

## Pre-Deployment Checklist

- [ ] Convex database is deployed and working
- [ ] You have Anthropic API key
- [ ] Twilio account created
- [ ] WhatsApp Business API access (or sandbox for testing)
- [ ] Chosen hosting platform (Railway, Render, or Heroku)

## Step 1: Twilio Setup

### Option A: WhatsApp Sandbox (Testing)

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Follow instructions to join sandbox:
   - Send WhatsApp message to provided number (e.g., +1-415-523-8886)
   - Send the join code (e.g., "join example-word")
4. Note your sandbox number for testing

### Option B: WhatsApp Business API (Production)

1. Go to Twilio Console → **Messaging** → **WhatsApp**
2. Click **Get Started** for WhatsApp Business API
3. Complete business verification (can take 1-2 weeks)
4. Request sender approval for your WhatsApp number
5. Once approved, note your WhatsApp-enabled number

### Get Twilio Credentials

1. From Twilio Console home, copy:
   - **Account SID** (starts with AC...)
   - **Auth Token** (click to reveal)
2. Save these for environment variables

## Step 2: Deploy to Hosting Platform

### Railway Deployment (Recommended)

1. **Install Railway CLI:**
```bash
npm install -g railway
```

2. **Login to Railway:**
```bash
railway login
```

3. **Initialize project:**
```bash
cd whatsapp-bot
railway init
```
   - Select "Create new project"
   - Name it "simchat-whatsapp-bot"

4. **Set environment variables:**
```bash
railway variables set CONVEX_URL=https://your-app.convex.cloud
railway variables set CONVEX_ADMIN_KEY=your-convex-admin-key
railway variables set ANTHROPIC_API_KEY=your-anthropic-key
railway variables set ANTHROPIC_MODEL=claude-haiku-4-5-20251001
railway variables set TWILIO_ACCOUNT_SID=ACxxxxx
railway variables set TWILIO_AUTH_TOKEN=your-auth-token
railway variables set TWILIO_WHATSAPP_NUMBER=+14155238886
railway variables set WHATSAPP_AUTH_PASSWORD=YourSecurePassword123
railway variables set PORT=3000
```

5. **Deploy:**
```bash
railway up
```

6. **Get deployment URL:**
```bash
railway domain
```
   - If no domain, create one: `railway domain create`
   - Copy the URL (e.g., `https://simchat-whatsapp-bot.up.railway.app`)

### Render Deployment

1. **Create account at [render.com](https://render.com)**

2. **Create new Web Service:**
   - Click "New" → "Web Service"
   - Connect GitHub repository
   - Or use "Public Git repository" and paste repo URL

3. **Configure service:**
   - **Name**: simchat-whatsapp-bot
   - **Root Directory**: `whatsapp-bot`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Add environment variables:**
   - Click "Environment" tab
   - Add all variables from `.env.example`
   - Click "Save Changes"

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes for first deploy with Puppeteer)
   - Copy the service URL

### Heroku Deployment

1. **Install Heroku CLI:**
```bash
brew install heroku/brew/heroku  # macOS
# or
curl https://cli-assets.heroku.com/install.sh | sh  # Linux
```

2. **Login and create app:**
```bash
heroku login
heroku create simchat-whatsapp-bot
```

3. **Add buildpacks (required for Puppeteer):**
```bash
heroku buildpacks:add jontewks/puppeteer
heroku buildpacks:add heroku/nodejs
```

4. **Set environment variables:**
```bash
heroku config:set CONVEX_URL=https://your-app.convex.cloud
heroku config:set CONVEX_ADMIN_KEY=your-convex-admin-key
heroku config:set ANTHROPIC_API_KEY=your-anthropic-key
heroku config:set TWILIO_ACCOUNT_SID=ACxxxxx
heroku config:set TWILIO_AUTH_TOKEN=your-auth-token
heroku config:set TWILIO_WHATSAPP_NUMBER=+14155238886
heroku config:set WHATSAPP_AUTH_PASSWORD=YourSecurePassword123
```

5. **Deploy:**
```bash
# From repository root
git subtree push --prefix whatsapp-bot heroku main
# Or if already in whatsapp-bot folder
git push heroku main
```

6. **Get app URL:**
```bash
heroku open
# Or check: https://simchat-whatsapp-bot.herokuapp.com
```

## Step 3: Configure Twilio Webhook

1. **Go to Twilio Console** → **Messaging** → **Settings** → **WhatsApp Sandbox Settings**
   (or for production: **WhatsApp Senders** → your number → **Sender webhook**)

2. **Set webhook URL:**
   ```
   https://your-deployment-url.com/webhook/whatsapp
   ```
   Replace `your-deployment-url.com` with your actual deployment URL

3. **Configure webhook:**
   - **Method**: POST
   - **Content Type**: application/x-www-form-urlencoded (default)

4. **Status callback (optional):**
   ```
   https://your-deployment-url.com/webhook/whatsapp/status
   ```

5. **Save configuration**

## Step 4: Test the Bot

### Test Basic Functionality

1. **Send a test message:**
   - Open WhatsApp
   - Send message to your Twilio WhatsApp number
   - Should receive authentication prompt

2. **Authenticate:**
   - Reply with your `WHATSAPP_AUTH_PASSWORD`
   - Should receive success confirmation

3. **Test scenario generation:**
   ```
   Create a sepsis scenario for junior nurses
   ```
   - Should receive typing indicator
   - Then receive PDF with scenario

4. **Test commands:**
   ```
   /help
   /status
   /clear
   ```

### Test Group Chat

1. **Create WhatsApp group**
2. **Add bot number to group**
3. **@mention bot with request:**
   ```
   @YourBotNumber Create a cardiac arrest scenario
   ```
4. **Verify bot responds only when mentioned**

## Step 5: Monitor and Maintain

### Check Logs

**Railway:**
```bash
railway logs
```

**Render:**
- Go to service dashboard → "Logs" tab

**Heroku:**
```bash
heroku logs --tail
```

### Monitor Twilio

1. Go to Twilio Console → **Monitor** → **Logs**
2. Check for delivery issues
3. Review error rates

### Monitor Convex

1. Go to Convex dashboard
2. Check **Logs** for database errors
3. Review **Data** to see conversations and users

### Cost Monitoring

**Twilio:**
- Console → **Usage & Billing**
- Set up alerts for spending thresholds

**Anthropic:**
- Check usage in Anthropic Console
- Typical cost: $0.05-0.10 per scenario

## Troubleshooting

### "Failed to launch browser" (Puppeteer)

**Railway/Render**: Usually works out of box

**Heroku**: Ensure buildpacks are added correctly:
```bash
heroku buildpacks
# Should show:
# 1. jontewks/puppeteer
# 2. heroku/nodejs
```

### Webhook timeout (504)

**Issue**: PDF generation takes > 30 seconds

**Solution 1**: Increase worker timeout
- Railway: No action needed
- Render: Go to service settings, increase timeout
- Heroku: Use hobby plan or higher

**Solution 2**: Reduce PDF complexity by disabling ECG rendering timeout

### Messages not delivered

1. Check Twilio webhook logs for 4xx/5xx errors
2. Verify webhook URL is accessible: `curl https://your-url/health`
3. Check app logs for exceptions
4. Ensure all environment variables are set

### High memory usage

Puppeteer can use 200-400MB per PDF generation.

**Solution**:
- Use smaller hosting plan (512MB minimum)
- Railway/Render: Auto-scales
- Heroku: Use Standard-1X or higher

## Scaling Considerations

### For High Usage (100+ users)

1. **Add queue system:**
   - Use BullMQ or Redis Queue
   - Process PDFs asynchronously
   - Prevents timeout on webhook

2. **Use dedicated PDF service:**
   - Deploy separate service for PDF generation
   - Scale independently

3. **Implement rate limiting:**
   ```javascript
   // In messageHandler.js
   const rateLimit = new Map();
   // Limit 5 requests per minute per user
   ```

4. **Caching:**
   - Cache common scenarios
   - Store pre-generated PDFs

## Security Hardening

### Validate Twilio Webhook

Add signature validation to prevent unauthorized webhook calls:

```javascript
import twilio from 'twilio';

app.post('/webhook/whatsapp', (req, res, next) => {
  const signature = req.headers['x-twilio-signature'];
  const url = `https://${req.hostname}${req.originalUrl}`;
  
  if (!twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    req.body
  )) {
    return res.status(403).send('Forbidden');
  }
  
  next();
});
```

### Rotate Credentials

1. Change `WHATSAPP_AUTH_PASSWORD` monthly
2. Rotate Twilio auth token every 6 months
3. Rotate Convex admin key yearly

### Monitor Unauthorized Access

Set up alerts for:
- Failed authentication attempts
- Unusual usage patterns
- High API costs

## Backup and Recovery

### Database Backup

Convex handles backups automatically, but you can:
1. Export user data monthly
2. Download conversation history
3. Store in secure location

### Disaster Recovery

If bot goes down:
1. Check hosting platform status
2. Review recent deployments
3. Roll back if needed:
   ```bash
   # Railway
   railway rollback
   
   # Heroku
   heroku releases:rollback
   ```

## Going Live Checklist

- [ ] Bot deployed and accessible
- [ ] Webhook configured in Twilio
- [ ] All environment variables set
- [ ] Tested authentication flow
- [ ] Tested scenario generation
- [ ] Tested group chat functionality
- [ ] Monitoring/logging set up
- [ ] Cost alerts configured
- [ ] Documentation shared with team
- [ ] Emergency contacts documented

## Support Resources

- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Render**: [render.com/docs](https://render.com/docs)
- **Twilio**: [twilio.com/docs/whatsapp](https://www.twilio.com/docs/whatsapp)
- **Puppeteer**: [pptr.dev](https://pptr.dev)

## Next Steps

After successful deployment:
1. Share bot number with authorized users
2. Provide authentication password securely
3. Monitor usage for first week
4. Collect user feedback
5. Iterate on prompt/features as needed
