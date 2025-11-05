import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PRDList from '@/components/PRDList';
import { Plus, ArrowLeft } from 'lucide-react';

export default function PRDHubPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0f0f11] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-semibold">PRDs</h1>
          </div>
          <Button onClick={() => navigate('/prd/new')} className="bg-purple-500 hover:bg-purple-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create PRD
          </Button>
        </div>
        <PRDList />
      </div>
    </div>
  );
}


