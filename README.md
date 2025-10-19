# Haven7 - AI-Powered Workplace Search

<div align="center">

![Haven7](https://img.shields.io/badge/Haven7-AI%20Search-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**Search your work knowledge in seconds. All your scattered information from Slack, Notion, and Google Drive in one place.**

[Features](#key-features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Tech Stack](#tech-stack)

</div>

---

## 🎯 What is Haven7?

Haven7 is an AI-powered search platform that unifies your workplace knowledge across multiple tools. Instead of searching through Slack messages, Notion pages, and Google Drive files separately, Haven7 provides a single, intelligent search interface that:

- **Searches across all your connected platforms** simultaneously
- **Generates AI summaries** of search results using OpenAI's GPT models
- **Enables conversational follow-ups** to dig deeper into your findings
- **Maintains search history** with persistent conversation threads
- **Provides contextual answers** using Retrieval Augmented Generation (RAG)

**Built for Product Managers** and teams who need to quickly access distributed information without context switching.

---

<a name="key-features"></a>

## ✨ Key Features

### 🔍 **Unified Search**
Search across Slack messages, Notion pages, and Google Drive documents with a single query. No more app switching.

### 🤖 **AI-Powered Summaries**
Get instant AI-generated summaries of your search results, highlighting the most relevant information.

### 💬 **Conversational Search**
Ask follow-up questions to refine your search. Haven7 maintains context and searches within your initial results.

### 📚 **Smart Document Sync & Embeddings**
Automatically syncs and indexes your documents with vector embeddings for semantic search capabilities. Features intelligent incremental sync that only processes changed content for faster, more efficient updates.

### 🔍 **TF-IDF Content Fingerprinting & Duplicate Detection**
- **Cross-Source Duplicate Detection**: Automatically detects similar documents across Slack, Notion, and Google Drive
- **Manual Override UI**: Users can confirm or dismiss detected duplicates with intuitive controls
- **Version Linking**: Link documents as versions of the same content for better organization
- **Smart Deduplication**: Search results show only the latest version of linked documents
- **Pure JavaScript Implementation**: No external dependencies, fast and reliable

### ⚡ **Incremental Sync & Recency Ranking**
- **Smart Sync**: Only processes changed files, pages, and messages since last sync
- **Recency Boost**: Recent documents automatically rank higher in search results
- **Efficiency Metrics**: See exactly how much processing time was saved
- **Performance Optimization**: Reduced API calls and bandwidth usage

### 🔐 **Secure OAuth Integration**
Connect your accounts securely using OAuth 2.0. We never store your passwords.

### 📝 **Thread Management**
Save and revisit your search conversations. Never lose track of important research.

### 🎨 **Modern UI/UX**
Beautiful, intuitive interface built with modern design principles for the best user experience.

---

<a name="quick-start"></a>

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm ([Install with nvm](https://github.com/nvm-sh/nvm))
- **mkcert** for local HTTPS ([Install with Homebrew](https://mkcert.dev))
- **Supabase Account** ([Sign up free](https://supabase.com))
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))
- **OAuth Credentials** for Slack, Google Drive, and Notion

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd source-searcher-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up local HTTPS certificates**
   ```bash
   # Install mkcert CA (one-time setup)
   sudo mkcert -install
   
   # Generate certificates for localhost
   mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1
   ```
   
   See [HTTPS Setup Guide](./docs/setup/HTTPS_SETUP.md) for details.

4. **Set up environment variables**
   ```bash
   cp env.local.example .env.local
   ```
   
   Configure your `.env.local` with:
   - Supabase URL and keys
   - OpenAI API key
   - OAuth credentials for Slack, Google, and Notion
   
   See [Environment Setup Guide](./docs/setup/LOVABLE_ENV_SETUP.md) for details.

5. **Set up the database**
   ```bash
   # Run the schema and migrations in order
   # See database/README.md for detailed instructions
   ```

6. **Start the development servers**
   ```bash
   npm run dev
   ```
   This starts both the frontend (Vite on HTTPS) and backend (Express on HTTPS) concurrently.

7. **Open in browser**
   ```
   https://localhost:8080
   ```

For detailed setup instructions, see the [Quick Start Guide](./docs/setup/QUICK_START.md).

---

## 💡 How It Works

### Search Flow

```
User enters query
    ↓
Search across connected sources (Slack, Notion, Google Drive)
    ↓
Retrieve relevant documents using vector similarity
    ↓
Generate AI summary with OpenAI GPT-4
    ↓
Display results with source attribution
    ↓
User can ask follow-up questions (RAG within results)
```

### Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐
│  React Frontend │ ←──────→│  Express Backend │
│   (Vite + TS)   │         │    (Node.js)     │
└─────────────────┘         └──────────────────┘
         ↓                            ↓
    ┌─────────┐              ┌────────────────┐
    │ Supabase│              │  OpenAI API    │
    │   Auth  │              │  (Embeddings   │
    │   DB    │              │   + GPT-4)     │
    └─────────┘              └────────────────┘
                                     ↓
                         ┌─────────────────────┐
                         │ External Services   │
                         │ - Slack API         │
                         │ - Google Drive API  │
                         │ - Notion API        │
                         └─────────────────────┘
```

---

## 📁 Project Structure

```
source-searcher-pro/
├── src/                      # Frontend React application
│   ├── components/           # React components
│   ├── pages/                # Page components (routes)
│   ├── contexts/             # React contexts (Auth, etc.)
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility libraries
│   └── integrations/         # Supabase client
├── server/                   # Backend Express server
│   ├── index.js              # Main server file
│   ├── utils/                # Utility functions
│   │   └── document-similarity.js # TF-IDF implementation
│   └── services/             # Business logic services
│       ├── search-service.js # Search & AI logic
│       ├── document-sync.js  # Document syncing
│       ├── notion-sync.js    # Notion integration
│       └── slack-sync.js     # Slack integration
├── database/                 # SQL files (organized)
│   ├── schema/               # Database schemas
│   ├── migrations/           # Database migrations
│   ├── fixes/                # Bug fixes & patches
│   └── debug/                # Diagnostic queries
├── docs/                     # Documentation (organized)
│   ├── authentication/       # Auth & OAuth guides
│   ├── features/             # Feature documentation
│   ├── setup/                # Setup guides
│   └── ...                   # More categories
├── public/                   # Static assets
└── dist/                     # Production build output
```

---

<a name="tech-stack"></a>

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **React Router** - Routing
- **TanStack Query** - Data fetching

### Backend
- **Node.js + Express** - API server
- **Supabase** - Database & authentication
- **OpenAI API** - Embeddings & GPT-4
- **OAuth 2.0** - Third-party integrations

### Integrations
- **Slack API** - Message search
- **Google Drive API** - Document search
- **Notion API** - Page search

---

<a name="documentation"></a>

## 📚 Documentation

All documentation has been organized for easy navigation:

### Getting Started
- [Quick Start Guide](./docs/setup/QUICK_START.md) - Get up and running
- [Slack Quick Start](./docs/setup/SLACK_QUICKSTART.md) - Fast Slack setup
- [Environment Setup](./docs/setup/LOVABLE_ENV_SETUP.md) - Configure environment variables
- [Documentation Index](./docs/INDEX.md) - Complete navigation guide

### Features
- [Slack Integration](./docs/features/SLACK_INTEGRATION_GUIDE.md) - Complete Slack setup and sync
- [Notion Integration](./docs/features/NOTION_INTEGRATION_COMPLETE.md) - Notion setup
- [Search Improvements](./docs/features/SEARCH_IMPROVEMENTS_README.md) - Search capabilities
- [Search Results](./docs/features/SEARCH_RESULTS_README.md) - Results display

### Authentication
- [Auth Setup](./docs/authentication/AUTH_README.md) - Authentication overview
- [OAuth Setup](./docs/authentication/PRODUCTION_OAUTH_GUIDE.md) - OAuth integration
- [OAuth Debug Guide](./docs/authentication/OAUTH_DEBUG_GUIDE.md) - Troubleshooting

### Database
- [Database README](./database/README.md) - SQL file organization
- [Schema Files](./database/schema/) - Database structure
- [Migrations](./database/migrations/) - Version updates

---

## 🔐 Security & Privacy

- **OAuth 2.0** - Secure authentication without storing passwords
- **Token Encryption** - Access tokens are encrypted at rest
- **Row Level Security (RLS)** - Database-level access control
- **API Rate Limiting** - Protection against abuse
- **Environment Variables** - Sensitive data never committed to git

See [Security Guide](./docs/authentication/SUPABASE_AUTH_SECURITY_GUIDE.md) for details.

---

## 🎨 User Interface

Haven7 features a modern, minimalist interface designed specifically for product managers:

- **Clean search interface** - Focus on what matters
- **Thread-based navigation** - Organized sidebar with search history
- **Real-time feedback** - Loading states and progress indicators
- **Responsive design** - Works on desktop and mobile
- **Dark mode support** - Easy on the eyes

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code:
- Follows the existing code style
- Includes appropriate tests
- Updates documentation as needed

---

## 📊 Project Status

**Current Version:** Beta  
**Last Updated:** October 2025  
**Active Development:** Yes

### Recent Updates
- ✅ **Local HTTPS Setup** - mkcert-based secure local development
- ✅ **Slack Integration** - Full OAuth, sync, and message search
- ✅ **Notion Integration** - Complete page and database search
- ✅ **Google Drive Integration** - Document and file search
- ✅ **AI Summary Generation** - GPT-4 powered result summaries
- ✅ **Conversational Follow-ups** - RAG within search results
- ✅ **Thread Management** - Persistent search conversations
- ✅ **Enhanced Error Handling** - Per-source error states with beautiful UI
- ✅ **OAuth 2.0** - Secure authentication for all platforms
- ✅ **Unified HTTPS Architecture** - All OAuth flows use https://localhost:3000
- ✅ **TF-IDF Content Fingerprinting** - Cross-source duplicate detection with manual override UI
- ✅ **Version Linking System** - Link documents as versions with smart deduplication
- ✅ **Enhanced UI/UX** - Loading states, animations, and visual feedback for duplicate management

### Roadmap
- 🔄 Microsoft Teams integration
- 🔄 Advanced filtering options
- 🔄 Team collaboration features
- 🔄 Analytics dashboard
- 🔄 Mobile app

---

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev/)
- [Supabase](https://supabase.com/)
- [OpenAI](https://openai.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📞 Support

- **Documentation:** [docs/INDEX.md](./docs/INDEX.md)
- **Issues:** Open an issue on GitHub
- **Email:** saiashishpalai74@gmail.com

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">

**Built for Product Managers**

Made with ❤️ by the Haven7 team

</div>
