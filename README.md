# Haven7 - Source Searcher Pro

A powerful AI-powered search platform that connects to your Google Drive, Slack, and Notion workspaces to provide intelligent search across all your content.

## 🚀 Features

- **Multi-Source Search**: Search across Google Drive, Slack, and Notion simultaneously
- **AI-Powered**: Advanced semantic search with OpenAI integration
- **Incremental Sync (Drive)**: Sync only new/updated files using `modifiedTime` + `md5Checksum`
- **Automatic Token Refresh**: OAuth tokens refresh automatically, connections last up to 6 months
- **Full Sync After Data Clear**: Clear and resync triggers full sync of all files (up to 200)
- **PDF Parsing**: Robust parsing with caching, timeouts, and graceful fallbacks
- **Safety Limits**: Per-run cap of 200 Drive files with newest-first pagination
- **Modern UI**: Progress `(processed/200)` and post-sync KPIs (Files, Updated, Unchanged, Efficiency)

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite (deployed on Vercel)
- **Backend**: Node.js + Express (deployed on Render)
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT for semantic search
- **OAuth**: Google Drive, Slack, Notion integrations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- OpenAI API key
- OAuth credentials for Google, Slack, and Notion

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/saiashishpalai/source-searcher-pro.git
   cd source-searcher-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## 📚 Documentation

- [Setup Guide](docs/setup/QUICK_START.md) - Complete setup instructions
- [OAuth Configuration](docs/authentication/SUPABASE_AUTH_SETUP_GUIDE.md) - OAuth setup for all services
- [Database Schema](docs/database/DATABASE_SCHEMA.md) - Database structure and migrations
- [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md) - Production deployment instructions
- [API Documentation](docs/api/API_REFERENCE.md) - Backend API endpoints

## 🔧 Development

### Project Structure

```
├── src/                    # Frontend React application
├── server/                 # Backend Express server
├── database/               # Database migrations and schemas
├── docs/                   # Documentation
└── public/                 # Static assets
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run server` - Start backend server

## 🔐 Security

- OAuth 2.0 authentication with automatic token refresh
- Row Level Security (RLS) in Supabase
- Encrypted token storage
- Secure environment variable management
- Automatic token expiration handling (Google Drive tokens refresh before expiry)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For support and questions, please open an issue on GitHub.