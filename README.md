# SimChat – Clinical Scenario Generator & Previewer

SimChat is a modern web application for generating, previewing, and managing clinical simulation scenarios using AI. It features a chat-based interface, scenario file download, and a rich previewer for scenario JSON files.

---

## Features

- **AI-Powered Scenario Generation**: Generate high-quality, realistic clinical simulation scenarios using Anthropic Claude.
- **Chat Interface**: Request scenarios, view AI responses, and manage conversations.
- **Scenario Download**: Download generated scenarios as JSON files, named by scenario title.
- **Scenario Previewer**: Instantly preview scenario JSONs in a dedicated, print-friendly HTML previewer.
- **Sidebar Log**: See all chats, scenario names, and quickly access preview/download for each scenario.
- **Persistent Loading Indicator**: Clear feedback while AI is working on your request.
- **Customizable Prompts**: Easily update the system prompt for scenario generation.
- **Netlify Functions**: Handles long-running AI requests with background processing.
- **Convex Integration**: (Optional) Persistent storage for conversations and scenarios.

---

## Project Structure

```
simchat/
├── convex/                # Convex database schema and functions (optional)
├── netlify/functions/     # Netlify background functions for AI
├── public/
│   ├── preview.html       # Scenario previewer (opens with Preview button)
│   └── ...                # Static assets (logos, manifest, etc.)
├── src/
│   ├── components/        # Chat UI, sidebar, loading indicator, etc.
│   ├── routes/            # Main chat and app routes
│   ├── store/             # State management (TanStack Store)
│   ├── utils/             # AI helpers, scenario logic
│   └── ...                # App entry, styles, etc.
├── package.json
├── README.md
└── ...
```

---

## Getting Started

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd simchat
npm install
```

### 2. Environment Setup

Copy the example env file and add your API keys:

```bash
cp .env.example .env
```

- Set your `VITE_ANTHROPIC_API_KEY` (required for AI)
- Optionally set Convex and Sentry keys for persistence and error monitoring

### 3. Run Locally

```bash
npm run dev
```

App will be available at [http://localhost:3000](http://localhost:3000)

### 4. Netlify Dev (Recommended)

For full Netlify function support:

```bash
npm install -g netlify-cli
netlify dev
```

---

## Usage

- **Request a Scenario**: Type your scenario request in the chat and submit.
- **Wait for AI**: The loading indicator will remain until the scenario is ready.
- **Download/Preview**: Use the sidebar to download the scenario JSON or open it in the previewer.
- **Previewer**: `/preview.html` displays scenario JSON in a formatted, printable layout. The chat’s Preview button sends the scenario directly to the previewer.

---

## Customization

- **System Prompt**: Edit `src/utils/ai.ts` to update the default scenario request prompt.
- **Previewer**: Edit `public/preview.html` for custom print layouts or branding.
- **Netlify Functions**: See `netlify/functions/genAIResponse-background.js` for AI request handling.

---

## Tech Stack

- React + TanStack Router + TanStack Store
- Tailwind CSS
- Anthropic Claude API
- Netlify Functions
- Convex (optional)
- Sentry (optional)

---

## Contributing

Pull requests and issues are welcome! Please document any new features or changes in this README.

---

## License

MIT
