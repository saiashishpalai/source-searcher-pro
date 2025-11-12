
import { useEffect } from "react";

import { ArrowRight, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import SEO from "@/components/SEO";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { useAuth } from "@/contexts/AuthContext";

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
      <div className="min-h-screen bg-background text-foreground dark:bg-black dark:text-white flex items-center justify-center transition-colors">
        <div className="text-foreground dark:text-white">Loading...</div>
      </div>
    );
  }

  // Don't render landing page if user is authenticated
  if (user) {
    return null;
  }
  return (
    <>
      <SEO
        title="Haven7 - Search Your Work Knowledge in Seconds"
        description="AI-powered search across Slack, Google Drive, and Notion. Find what you need without switching apps. Join 500+ product managers already using Haven7."
        url="https://source-searcher-pro.vercel.app/"
        image="https://source-searcher-pro.vercel.app/main_preview.jpg"
      />
      <div className="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors">
        <BackgroundPaths
          title="Stop Tab-Switching. Start Shipping."
          description="Search your workspace, speak your ideas, and build AI-crafted PRDs with conviction."
          cta={
            <div className="flex flex-col items-center gap-6">
              <div className="group relative inline-flex overflow-hidden rounded-2xl bg-gradient-to-b from-primary/15 to-primary/5 p-px shadow-lg transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-2xl dark:from-primary/20 dark:to-primary/5">
                <Button
                  asChild
                  size="lg"
                  className="rounded-[1.15rem] border border-primary/20 bg-primary px-8 py-6 text-lg font-semibold text-primary-foreground shadow-none transition-all duration-300 hover:bg-primary/90 dark:border-primary/30"
                >
                  <Link to="/signup" className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                    Get Early Access
                    <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Join 500+ product managers already using Haven7
              </p>
            </div>
          }
        />

        <header className="absolute inset-x-0 top-0 z-20 p-6">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">Haven7</div>
            <ThemeToggle />
          </div>
        </header>

        <footer className="absolute inset-x-0 bottom-0 z-20 p-6">
          <div className="text-center text-muted-foreground">Built for Product Managers</div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
