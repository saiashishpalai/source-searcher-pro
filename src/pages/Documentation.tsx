import React from 'react';
import { Link } from 'react-router-dom';
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
  Shield,
  Zap,
  BookOpen,
  HelpCircle,
  LayoutDashboard,
  Ticket
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const Documentation = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-[#1a0a2e]/40 via-black to-black" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <Link 
            to="/connected-sources" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Connected Sources
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Documentation
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl">
                Everything you need to know about using Haven7 to unify your workplace knowledge.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all"
                onClick={() => window.open('mailto:saiashishpalai74@gmail.com', '_blank')}
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Support
              </Button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Getting Started */}
          <div className="lg:col-span-2">
            <Card className="h-full bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  Haven7 is an AI-powered search platform that unifies your workplace knowledge across multiple tools. 
                  Instead of searching through Slack messages, Notion pages, and Google Drive files separately, 
                  Haven7 provides a single, intelligent search interface.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-300 hover:bg-purple-500/20">AI-Powered Search</Badge>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-300 hover:bg-blue-500/20">Unified Interface</Badge>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-300 hover:bg-green-500/20">Real-time Sync</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links / Support */}
          <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Zap className="w-5 h-5 text-yellow-400" />
                Quick Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-xs text-white">1</div>
                  <p className="text-sm text-gray-400">Connect all your sources for better context</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-xs text-white">2</div>
                  <p className="text-sm text-gray-400">Use natural language for search queries</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-xs text-white">3</div>
                  <p className="text-sm text-gray-400">Regularly sync to keep data fresh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connecting Sources */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <LinkIcon className="w-5 h-5 text-blue-400" />
                Connecting Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 bg-[#4A154B] rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-medium">Slack</h4>
                    <p className="text-gray-500 text-xs">Messages & Files</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 bg-[#4285F4] rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-medium">Google Drive</h4>
                    <p className="text-gray-500 text-xs">Docs & Folders</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 bg-black border border-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Database className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-medium">Notion</h4>
                    <p className="text-gray-500 text-xs">Pages & Databases</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Jira Integration */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Ticket className="w-5 h-5 text-blue-400" />
                Jira Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">Create tickets directly from PRDs</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">Two-way status sync</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">Review drafts before publishing</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-xs">
                  Connect via OAuth 2.0 to start transforming requirements into execution.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tracker */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <LayoutDashboard className="w-5 h-5 text-purple-400" />
                Tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">Unified view of all PRDs</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">Track execution progress</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">Identify blockers instantly</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-purple-300 text-xs">
                  Monitor status across all your projects from a single dashboard.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Search & Sync */}
          <Card className="md:col-span-2 lg:col-span-3 bg-gradient-to-r from-white/5 to-transparent border-white/10 backdrop-blur-sm">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                  <Search className="w-5 h-5 text-pink-400" />
                  Smart Search
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-2 flex-shrink-0" />
                    Natural language queries ("What was discussed about the API?")
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-2 flex-shrink-0" />
                    AI-generated summaries with citations
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-2 flex-shrink-0" />
                    Follow-up questions for deeper context
                  </li>
                </ul>
              </div>
              
              <div className="p-6 border-t md:border-t-0 md:border-l border-white/10">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                  <Database className="w-5 h-5 text-green-400" />
                  Sync Management
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                    Incremental syncs only process changed content
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                    Manage connections from the profile settings
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                    Secure OAuth 2.0 handling for all sources
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Haven7. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
