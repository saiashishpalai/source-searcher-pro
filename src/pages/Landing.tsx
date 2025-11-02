
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is authenticated, redirect to dashboard
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render landing page if user is authenticated
  if (user) {
    return null;
  }
  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Radial gradient overlay from center */}
      <div className="absolute inset-0 bg-gradient-radial from-[#1a0a2e]/40 via-black to-black pointer-events-none" />
      
      {/* Soft purple glow accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-fuchsia-600/15 rounded-full blur-[128px]" />
      </div>

      {/* Header with Logo */}
      <header className="p-6 relative z-10">
        <div className="text-2xl font-bold text-white animate-fade-in">
          Haven7
        </div>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto">
          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight animate-fade-in-up">
            Search Your Work Knowledge in Seconds
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            AI-powered search across Slack, Notion, and Google Drive. Find what you need without switching apps.
          </p>
          
          {/* CTA Button with Enhanced Animations */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Link 
            to="/signup"
              className="group relative inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-primary/25 active:scale-95 overflow-hidden"
            >
              {/* Animated background shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              
              {/* Button content */}
              <span className="relative flex items-center gap-3">
                <Sparkles className="w-5 h-5 animate-pulse" />
                Get Early Access
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </span>
              
              {/* Ripple effect on click */}
              <div className="absolute inset-0 rounded-xl bg-white/20 scale-0 group-active:scale-100 transition-transform duration-150 ease-out" />
            </Link>
          </div>
          
          {/* Additional CTA hint */}
          <p className="text-sm text-gray-400 mt-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            Join 500+ product managers already using Haven7
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 relative z-10">
        <div className="text-center text-gray-400 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          Built for Product Managers
        </div>
      </footer>

    </div>
  );
};

export default Landing;
