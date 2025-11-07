import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PRDList from '@/components/PRDList';
import { Plus, ArrowLeft } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function PRDHubPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-semibold">PRDs</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              onClick={() => navigate('/prd/new')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create PRD
            </Button>
          </div>
        </div>
        <PRDList />
      </div>
    </div>
  );
}


