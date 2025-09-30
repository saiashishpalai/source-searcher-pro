import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col">
      {/* Header with Logo */}
      <header className="p-6">
        <div className="text-2xl font-bold text-white">
          Haven7
        </div>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-2xl mx-auto">
          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Search Your Work Knowledge in Seconds
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed">
            AI-powered search across Slack, Notion, and Google Drive. Find what you need without switching apps.
          </p>
          
          {/* CTA Button */}
          <Link 
            to="/signup"
            className="inline-block bg-[#A78BFA] hover:bg-[#9F7AEA] text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors duration-200"
          >
            Get Early Access
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6">
        <div className="text-center text-gray-400">
          Built for Product Managers
        </div>
      </footer>
    </div>
  );
};

export default Landing;
