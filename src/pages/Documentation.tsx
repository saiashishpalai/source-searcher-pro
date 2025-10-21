import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Search, 
  Link as LinkIcon, 
  Database, 
  MessageSquare, 
  FileText, 
  Settings,
  CheckCircle,
  ExternalLink,
  Users,
  Shield,
  Zap,
  BookOpen,
  HelpCircle
} from 'lucide-react';

const Documentation = () => {
  return (
    <div className="flex min-h-screen bg-black">
      {/* Left side - Content */}
      <div className="w-full lg:w-1/2 flex flex-col p-4 lg:p-8 relative overflow-y-auto">
        {/* Radial gradient overlay from center */}
        <div className="absolute inset-0 bg-gradient-radial from-[#1a0a2e]/40 via-black to-black pointer-events-none" />
        
        {/* Soft purple glow accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-fuchsia-600/15 rounded-full blur-[128px]" />
        </div>

        <div className="w-full max-w-2xl relative z-20 py-8">
          {/* Back to Dashboard */}
          <div className="mb-8 animate-fade-in">
            <Link to="/connected-sources" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition">
              <ArrowLeft className="w-4 h-4" />
              Back to Connected Sources
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Haven7 Documentation
            </h1>
            <p className="text-gray-400 text-base">
              Everything you need to know about using Haven7
            </p>
          </div>

          {/* Documentation Sections */}
          <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            
            {/* Getting Started */}
            <Card className="bg-white/5 border border-gray-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-300 text-sm">
                  Haven7 is a cross-workspace knowledge aggregation platform for multi-client professionals. 
                  Instead of juggling between different Slack workspaces, Notion workspaces, Google Drive accounts, and Microsoft Teams tenants, 
                  Haven7 provides a single, intelligent search interface across ALL your clients and projects.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">
                    Cross-Workspace Search
                  </Badge>
                  <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">
                    Multi-Client Support
                  </Badge>
                  <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">
                    AI-Powered Summaries
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Connecting Sources */}
            <Card className="bg-white/5 border border-gray-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <LinkIcon className="w-5 h-5 text-blue-400" />
                  Connecting Sources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300 text-sm">
                  Connect your work tools across multiple clients to start searching across all your workspaces:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-8 h-8 bg-[#4A154B] rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Slack</h4>
                      <p className="text-gray-400 text-xs">Messages, files, and conversations</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-8 h-8 bg-[#4285F4] rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Google Drive</h4>
                      <p className="text-gray-400 text-xs">Files, documents, and folders</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                      <Database className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Notion</h4>
                      <p className="text-gray-400 text-xs">Pages, databases, and knowledge base</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-8 h-8 bg-[#5059C9] rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Microsoft Teams</h4>
                      <p className="text-gray-400 text-xs">Messages, channels, and team discussions</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-300 text-xs">
                    All connections use secure OAuth 2.0. We never store your passwords.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Syncing Documents */}
            <Card className="bg-white/5 border border-gray-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Database className="w-5 h-5 text-green-400" />
                  Syncing Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-300 text-sm">
                  After connecting sources, sync your documents to make them searchable:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">Click "Sync Documents" for each connected source</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">Documents are processed and indexed automatically</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">Incremental sync only processes changed content</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <Zap className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-green-300 text-xs">
                    Syncing may take a few minutes depending on your data size. You'll see progress indicators.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Searching */}
            <Card className="bg-white/5 border border-gray-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Search className="w-5 h-5 text-purple-400" />
                  Searching Your Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-300 text-sm">
                  Use the search interface to find information across all your connected sources:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">Type your question in natural language</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">Get AI-generated summaries of results</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">Ask follow-up questions to refine your search</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">Save search conversations for later reference</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Managing Connections */}
            <Card className="bg-white/5 border border-gray-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="w-5 h-5 text-orange-400" />
                  Managing Connections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-300 text-sm">
                  You can manage your connections anytime:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">View connection status and sync progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">Disconnect sources you no longer need</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">Clear synced data if needed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">Re-sync documents to get latest content</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card className="bg-white/5 border border-gray-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <HelpCircle className="w-5 h-5 text-red-400" />
                  Need More Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-300 text-sm">
                  If you're still having issues, we're here to help:
                </p>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-red-500/30 text-red-300 hover:bg-red-500/10"
                    onClick={() => window.open('mailto:saiashishpalai74@gmail.com?subject=Haven7%20Support%20Request', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-600 mt-8 text-center animate-fade-in" style={{ animationDelay: '1.4s' }}>
            Haven7 Documentation - Updated regularly
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* Background image - abstract purple gradient */}
        <img 
          src="/src/assets/auth-bg-2.jpg" 
          alt="Abstract purple gradient background" 
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        {/* Wide soft gradient blend from left */}
        <div className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-r from-black via-black/80 to-transparent z-10 pointer-events-none" />
        {/* Subtle vignette for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/30 z-10" />
      </div>
    </div>
  );
};

export default Documentation;
