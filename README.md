# Haven7 - AI-Powered Workplace Search

<div align="center">

![Haven7](https://img.shields.io/badge/Haven7-AI%20Search-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**Search across ALL your workspaces in seconds. Unify scattered information from Slack, Notion, Google Drive, and Microsoft Teams across multiple clients and projects.**

[Features](#key-features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Tech Stack](#tech-stack)

</div>

---

## 🎯 What is Haven7?

Haven7 is a **cross-workspace knowledge aggregation platform** that unifies information across multiple clients, projects, and workspaces. Instead of juggling between different Slack workspaces, Notion workspaces, Google Drive accounts, and Microsoft Teams tenants, Haven7 provides a single, intelligent search interface that:

- **Searches across ALL your workspaces** simultaneously (multiple clients, projects, teams)
- **Generates AI summaries** of search results using OpenAI's GPT models
- **Enables conversational follow-ups** to dig deeper into your findings
- **Maintains search history** with persistent conversation threads
- **Provides contextual answers** using Retrieval Augmented Generation (RAG)

**Built for multi-client professionals** - founders, agency PMs, freelancers, and consultants who manage multiple workspaces and need to find information across all their clients without context switching.

## 🎯 Real Use Cases

### The Multi-Client Professional Problem
You're managing multiple clients, each with their own:
- **Slack workspaces** (Client A, Client B, Client C...)
- **Notion workspaces** (different project documentation)
- **Google Drive accounts** (client-specific files)
- **Microsoft Teams tenants** (client meetings and discussions)

### The Information Chaos
- Client A discussed pricing in Teams channel last month
- Client B's decision about feature X was in a Slack DM
- Client C's meeting had critical feedback in a transcript
- You can't remember which workspace, which channel, which conversation

### The Haven7 Solution
**"Show me all conversations about 'pricing model' across ALL my clients"**

Instead of searching 5+ different workspaces individually, Haven7 searches everything at once and shows you:
- Client A's Teams discussion about pricing
- Client B's Slack conversation about the same topic
- Client C's Notion document with pricing strategy
- All in one unified search result

---

<a name="key-features"></a>

## ✨ Key Features

### 🔍 **Cross-Workspace Search**
Search across ALL your workspaces simultaneously - multiple Slack workspaces, Notion workspaces, Google Drive accounts, and Microsoft Teams tenants. Find information from Client A's Teams channel and Client B's Slack workspace in one search.

### 🤖 **AI-Powered Summaries**
Get instant AI-generated summaries of your search results, highlighting the most relevant information.

### 💬 **Conversational Search**
Ask follow-up questions to refine your search. Haven7 maintains context and searches within your initial results.

### 📚 **Smart Document Sync & Embeddings**
Automatically syncs and indexes your documents with vector embeddings for semantic search capabilities. Features intelligent incremental sync that only processes changed content for faster, more efficient updates.

### 🔍 **TF-IDF Content Fingerprinting & Duplicate Detection**
- **Cross-Source Duplicate Detection**: Automatically detects similar documents across Slack, Notion, Google Drive, and Microsoft Teams
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
- **Microsoft Graph API** - Teams message search (requires Office 365 license)

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

**Current Version:** Production Ready  
**Last Updated:** January 2025  
**Active Development:** Yes

### ✅ Production Ready Features
- ✅ **Complete OAuth Integration** - Slack, Google Drive, Notion, and Microsoft Teams with secure authentication
- ✅ **AI-Powered Search** - GPT-4 powered summaries and conversational follow-ups
- ✅ **Smart Document Sync** - Incremental sync with 70-90% efficiency gains
- ✅ **Advanced Search** - TF-IDF content fingerprinting and duplicate detection
- ✅ **Modern UI/UX** - Dynamic hover effects, animations, and responsive design
- ✅ **Profile Management** - Complete user profile settings with photo upload
- ✅ **Security** - OAuth 2.0, encrypted tokens, and comprehensive security measures
- ✅ **Performance** - Optimized sync, recency ranking, and efficient API usage
- ✅ **Microsoft Teams Integration** - Complete Teams message sync with Office 365 license requirements

### 🚀 Future Enhancements
- 🔄 Advanced filtering and search options
- 🔄 Team collaboration features
- 🔄 Analytics dashboard
- 🔄 Mobile application
- 🔄 API rate limiting and advanced security
- 🔄 Custom AI models and fine-tuning

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

**Built for Multi-Client Professionals**

Made with ❤️ by the Haven7 team

</div>
