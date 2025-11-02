import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { WaitlistForm } from "@/components/WaitlistForm";

const Waitlist = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl animate-background-drift" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-accent/8 to-primary/5 rounded-full blur-3xl animate-background-drift" style={{ animationDelay: '10s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-primary/5 to-accent/3 rounded-full blur-2xl animate-background-drift" style={{ animationDelay: '5s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <Link to="/" className="inline-flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <span className="text-2xl font-bold">Haven7</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-2xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Limited <span className="text-gradient">Early Access</span> Spots Available
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">
              Be among the first to experience Haven7's powerful knowledge search
            </p>
          </div>

          {/* Value Proposition */}
          <div className="grid md:grid-cols-3 gap-4 text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="glass-card rounded-lg p-4">
              <div className="text-2xl mb-2">🚀</div>
              <h3 className="font-semibold mb-1">Early Access</h3>
              <p className="text-sm text-muted-foreground">
                Get exclusive access before general availability
              </p>
            </div>
            <div className="glass-card rounded-lg p-4">
              <div className="text-2xl mb-2">⭐</div>
              <h3 className="font-semibold mb-1">Priority Support</h3>
              <p className="text-sm text-muted-foreground">
                Direct line to our team for assistance
              </p>
            </div>
            <div className="glass-card rounded-lg p-4">
              <div className="text-2xl mb-2">💡</div>
              <h3 className="font-semibold mb-1">Influence Roadmap</h3>
              <p className="text-sm text-muted-foreground">
                Help shape Haven7's future features
              </p>
            </div>
          </div>

          {/* Form Container */}
          <div className="glass-card rounded-lg p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <WaitlistForm />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center">
        <div className="text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.8s' }}>
          Built for Product Managers
        </div>
      </footer>
    </div>
  );
};

export default Waitlist;

