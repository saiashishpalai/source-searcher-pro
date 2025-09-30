import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col relative overflow-hidden">
      {/* Animated Background Elements - Consistent with ConnectSources */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl animate-background-drift" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-accent/8 to-primary/5 rounded-full blur-3xl animate-background-drift" style={{ animationDelay: '10s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-primary/5 to-accent/3 rounded-full blur-2xl animate-background-drift" style={{ animationDelay: '5s' }} />
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

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes background-drift {
          0%, 100% { 
            transform: translate(0, 0) scale(1); 
            opacity: 0.3; 
          }
          25% { 
            transform: translate(20px, -20px) scale(1.05); 
            opacity: 0.4; 
          }
          50% { 
            transform: translate(-10px, 10px) scale(0.95); 
            opacity: 0.2; 
          }
          75% { 
            transform: translate(15px, 5px) scale(1.02); 
            opacity: 0.35; 
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        
        .animate-background-drift {
          animation: background-drift 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Landing;
