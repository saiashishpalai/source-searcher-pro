import React, { useEffect, useState } from 'react';
import { ApiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FileText, GitBranch, Calendar, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PRD {
  id: string;
  title: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  version_group_id: string;
  change_summary?: string;
  created_by?: string;
}

export default function PRDList() {
  const [prds, setPrds] = useState<PRD[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingVersion, setCreatingVersion] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPRDs();
  }, []);

  const loadPRDs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { prds: data } = await ApiClient.listPRDs();
      setPrds(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load PRDs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVersion = async (prdId: string) => {
    setCreatingVersion(prdId);
    try {
      const { prd } = await ApiClient.createPRDVersion(prdId);
      await loadPRDs();
      // Navigate to edit the new version
      navigate(`/prd/${prd.id}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to create version');
    } finally {
      setCreatingVersion(null);
    }
  };

  const handleViewPRD = (prdId: string) => {
    navigate(`/prd/${prdId}`);
  };

  const handleDeleteGroup = async (groupId: string, title: string) => {
    if (!confirm(`Delete all versions of "${title}"? This cannot be undone.`)) return;
    try {
      await ApiClient.deletePRDGroup(groupId);
      await loadPRDs();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete PRD');
    }
  };

  const handleDeleteVersion = async (prdId: string) => {
    if (!confirm('Delete this PRD version? This cannot be undone.')) return;
    try {
      await ApiClient.deletePRDVersion(prdId);
      await loadPRDs();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete version');
    }
  };

  // Group PRDs by version_group_id (proper versioning, not title-based)
  const groupedPRDs = prds.reduce((acc, prd) => {
    const groupId = prd.version_group_id || 'un grouped';
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(prd);
    return acc;
  }, {} as Record<string, PRD[]>);

  // Sort versions within each group (newest first)
  Object.keys(groupedPRDs).forEach(groupId => {
    groupedPRDs[groupId].sort((a, b) => b.version - a.version);
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'draft':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading PRDs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-400 mb-4">{error}</div>
        <Button onClick={loadPRDs} variant="outline">Retry</Button>
      </div>
    );
  }

  if (prds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileText className="w-16 h-16 text-gray-500 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No PRDs yet</h3>
        <p className="text-gray-400 mb-4">Create your first PRD by typing "/prd" in the search bar</p>
        <Button onClick={() => navigate('/dashboard')} variant="outline">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">My PRDs</h1>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedPRDs).map(([groupId, versions]) => {
          // Get title from first version (all versions in a group have same title)
          const title = versions[0]?.title || 'Untitled';
          return (
          <div key={groupId} className="border border-gray-700 rounded-lg p-4 bg-[#1f1f23]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
                {versions.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleCreateVersion(versions[0].id)}
                        disabled={creatingVersion === versions[0].id}
                        className="p-2 rounded-md border border-gray-700 hover:border-purple-500/60 text-gray-300 hover:text-white disabled:opacity-50"
                      >
                        <GitBranch className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{creatingVersion === versions[0].id ? 'Creating…' : 'New Version'}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleDeleteGroup(groupId, title)}
                      className="p-2 rounded-md border border-red-500/30 text-red-400 hover:text-red-300 hover:border-red-500/60"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete PRD (all versions)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="space-y-2">
              {versions.map((prd) => (
                <div
                  key={prd.id}
                  onClick={() => handleViewPRD(prd.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleViewPRD(prd.id); }}
                  role="button"
                  tabIndex={0}
                  className="group flex items-center justify-between p-3 rounded-lg bg-[#0f0f11] border border-gray-800 hover:border-purple-500/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(prd.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">v{prd.version}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 capitalize">
                          {prd.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(prd.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteVersion(prd.id); }}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-md text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete version</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>
    </div>
    </TooltipProvider>
  );
}

