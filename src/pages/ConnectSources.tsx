import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Plus, ArrowRight, Loader2, ExternalLink } from 'lucide-react';

// SVG Icon Components (reusing from SearchInterface)
const SlackIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 122.8 122.8"
    className={className}
  >
    <path
      fill="#36C5F0"
      d="M30.3 77.7c0 5.6-4.6 10.2-10.2 10.2S10 83.3 10 77.7s4.6-10.2 10.2-10.2h10.1v10.2zm5.1 0c0-5.6 4.6-10.2 10.2-10.2s10.2 4.6 10.2 10.2v25.1c0 5.6-4.6 10.2-10.2 10.2s-10.2-4.6-10.2-10.2V77.7z"
    />
    <path
      fill="#2EB67D"
      d="M45.6 30.3c-5.6 0-10.2-4.6-10.2-10.2S40 10 45.6 10s10.2 4.6 10.2 10.2v10.1H45.6zm0 5.1c5.6 0 10.2 4.6 10.2 10.2s-4.6 10.2-10.2 10.2H20.5C14.9 55.8 10.3 51.2 10.3 45.6s4.6-10.2 10.2-10.2h25.1z"
    />
    <path
      fill="#ECB22E"
      d="M92.5 45.6c0-5.6 4.6-10.2 10.2-10.2s10.2 4.6 10.2 10.2-4.6 10.2-10.2 10.2H92.5V45.6zm-5.1 0c0 5.6-4.6 10.2-10.2 10.2s-10.2-4.6-10.2-10.2V20.5C67 14.9 71.6 10.3 77.2 10.3s10.2 4.6 10.2 10.2v25.1z"
    />
    <path
      fill="#E01E5A"
      d="M77.2 92.5c5.6 0 10.2 4.6 10.2 10.2s-4.6 10.2-10.2 10.2-10.2-4.6-10.2-10.2V92.5h10.2zm0-5.1c-5.6 0-10.2-4.6-10.2-10.2s4.6-10.2 10.2-10.2h25.1c5.6 0 10.2 4.6 10.2 10.2s-4.6 10.2-10.2 10.2H77.2z"
    />
  </svg>
);

const GoogleDriveIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 512 512"
    className={className}
  >
    <path
      fill="#4285F4"
      d="M160 32L0 320l96 160 160-288z"
    />
    <path
      fill="#FFBB00"
      d="M352 32h-192l160 288h192z"
    />
    <path
      fill="#34A853"
      d="M96 480h320l96-160H192z"
    />
  </svg>
);

const NotionIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    className={className}
  >
    <path
      fill="currentColor"
      d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.033-.793c1.635-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.747.934 1.213v16.378c0 1.026-.373 1.635-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.68-1.632z"
    />
  </svg>
);

const ConnectSources = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState({
    slack: false,
    googleDrive: false,
    notion: false
  });
  const [connectingSource, setConnectingSource] = useState<string | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  const availableSources = [
    {
      id: 'slack',
      name: 'Slack',
      description: 'Connect your Slack workspace to search messages, files, and conversations',
      icon: SlackIcon,
      connected: connections.slack,
      color: 'bg-[#4A154B]',
      available: true
    },
    {
      id: 'googleDrive',
      name: 'Google Drive',
      description: 'Access and search your Google Drive files, documents, and folders',
      icon: GoogleDriveIcon,
      connected: connections.googleDrive,
      color: 'bg-[#4285F4]',
      available: true
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Search through your Notion pages, databases, and knowledge base',
      icon: NotionIcon,
      connected: connections.notion,
      color: 'bg-[#000000]',
      available: true
    }
  ];

  const handleConnect = async (sourceId: string) => {
    setConnectingSource(sourceId);
    
    // Simulate OAuth flow
    setTimeout(() => {
      setConnections(prev => ({ ...prev, [sourceId]: true }));
      setConnectingSource(null);
      setIsIndexing(true);
      
      // Simulate indexing process
      setTimeout(() => {
        setIsIndexing(false);
      }, 3000);
    }, 2000);
  };

  const handleContinue = () => {
    // Navigate to main app
    window.location.href = '/';
  };

  const hasAnyConnection = Object.values(connections).some(Boolean);

  return (
    <div className="min-h-screen bg-background">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl animate-background-drift" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-accent/8 to-primary/5 rounded-full blur-3xl animate-background-drift" style={{ animationDelay: '10s' }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-border/30 bg-background/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">H7</span>
                </div>
                <span className="text-2xl font-semibold text-foreground">Haven7</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-4xl space-y-8">
            {/* Welcome Section */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Email Verified
              </div>
              <h1 className="text-3xl lg:text-4xl font-light text-foreground tracking-tight">
                Connect Your Knowledge
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Haven7 searches your work tools to answer questions with your actual context
              </p>
            </div>

            {/* Sources Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableSources.map((source) => (
                <Card 
                  key={source.id}
                  className="bg-card/60 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-lg group cursor-pointer h-full flex flex-col"
                  onClick={() => handleConnect(source.id)}
                >
                  <CardHeader className="pb-4 flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${source.color} flex items-center justify-center text-white`}>
                        <source.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {source.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={source.connected ? "default" : "outline"} 
                            className={`text-xs ${
                              source.connected 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                : ''
                            }`}
                          >
                            {source.connected ? 'Connected ✓' : 'Not connected'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1 flex flex-col">
                    <CardDescription className="text-sm text-muted-foreground mb-4 flex-1">
                      {source.description}
                    </CardDescription>
                    <div className="mt-auto">
                      <Button 
                        variant="outline" 
                        className="w-full group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors h-10"
                        disabled={connectingSource === source.id || source.connected}
                      >
                        {connectingSource === source.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : source.connected ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Connected
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Indexing State */}
            {isIndexing && (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-lg font-medium text-foreground">
                    Indexing your connected sources...
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This may take a few minutes depending on your data size
                </p>
              </div>
            )}

            {/* Continue Button */}
            <div className="text-center space-y-4">
              <Button 
                onClick={handleContinue}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-3"
                disabled={!hasAnyConnection || isIndexing}
              >
                {isIndexing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Indexing...
                  </>
                ) : (
                  <>
                    Continue to Haven7
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                {!hasAnyConnection 
                  ? 'Connect at least one source to continue' 
                  : 'You can always connect more sources later from your settings'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectSources;