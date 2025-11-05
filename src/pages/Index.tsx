
import React, { useEffect, useState } from 'react';
import SearchInterface from '@/components/SearchInterface';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '@/lib/api-client';

const Index = () => {
  const navigate = useNavigate();
  const [recentPRDs, setRecentPRDs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { prds } = await ApiClient.getRecentPRDs();
        setRecentPRDs(prds || []);
      } catch {
        setRecentPRDs([]);
      }
    })();
  }, []);

  return (
    <div className="relative min-h-screen">
      <SearchInterface />

      {recentPRDs.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-10">
          <div className="flex items-center justify-between mb-3 mt-6">
            <h2 className="text-lg font-semibold text-white">Recent PRDs</h2>
            <Button variant="ghost" onClick={() => navigate('/prds')} className="text-purple-400 hover:text-purple-300">View All →</Button>
          </div>
          <div className="space-y-2">
            {recentPRDs.map((prd) => (
              <button key={prd.id} onClick={() => navigate(`/prd/${prd.id}`)} className="w-full flex items-center gap-3 p-4 bg-[#1f1f23] hover:bg-[#2a2a2f] rounded-lg transition-colors text-left border border-gray-800">
                <FileText className="w-5 h-5 text-purple-400" />
                <div className="flex-1">
                  <p className="font-medium text-white">{prd.title}</p>
                  <p className="text-sm text-gray-400">v{prd.version} • {new Date(prd.updated_at).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
