import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PRDList from '@/components/PRDList';
import { Plus, ArrowLeft, Menu } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useState } from 'react';

export default function PRDHubPage() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  return (
    <div className="min-h-screen flex bg-[#050509] text-white">
      {showMobileSidebar && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setShowMobileSidebar(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#06040d]/95 text-white backdrop-blur-2xl border-r border-white/10 transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-80'} ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:relative lg:h-auto`}
      >
        <div className={`border-b border-white/10 ${sidebarCollapsed ? 'p-4' : 'px-6 py-5'}`}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(false)}
                className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white/65 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/prd/new')}
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                title="New PRD"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.55em] text-white/40">Haven7</span>
                  <span className="text-2xl font-semibold tracking-tight text-white">PRD Studio</span>
                </div>
                <p className="text-sm leading-relaxed text-white/55 max-w-xs">
                  A calm workspace where product ideas gain structure, evidence, and conviction.
                </p>
                <Button
                  onClick={() => navigate('/prd/new')}
                  className="group w-full justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium tracking-tight text-white/80 transition-all duration-300 hover:bg-white/20 hover:text-white"
                >
                  <span className="relative flex items-center gap-2">
                    <Plus className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    New PRD
                  </span>
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(true)}
                className="mt-1 h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                aria-label="Collapse sidebar"
              >
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          )}
        </div>
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.45em] text-white/40">Navigation</span>
                <ThemeToggle />
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </section>
          </div>
        )}
        {!sidebarCollapsed && (
          <div className="px-6 py-6 border-t border-white/10 text-xs text-white/45">
            View, iterate, and refine every PRD from a single library.
          </div>
        )}
      </aside>
      <div className="flex-1 flex flex-col">
        <div className="lg:hidden flex justify-end p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileSidebar(prev => !prev)}
            className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-white/70 backdrop-blur"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10">
              <div>
                <h1 className="text-3xl font-semibold text-white">PRD Library</h1>
                <p className="mt-2 text-sm text-white/60">Track every product requirements document, iterate on versions, and keep teams aligned.</p>
              </div>
            </div>
            <PRDList />
          </div>
        </div>
      </div>
    </div>
  );
}


