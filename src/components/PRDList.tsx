import React, { useEffect, useState } from 'react';
import { ApiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FileText, GitBranch, Calendar, CheckCircle, Trash2, FileEdit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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

  // Convert grouped PRDs to array for pagination
  const groupedPRDsArray = Object.entries(groupedPRDs);

  // Calculate pagination
  const totalGroups = groupedPRDsArray.length;
  const totalPages = Math.ceil(totalGroups / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGroups = groupedPRDsArray.slice(startIndex, endIndex);

  // Reset to page 1 when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Reset to page 1 when PRDs change
  useEffect(() => {
    setCurrentPage(1);
  }, [prds.length]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'draft':
        return <FileEdit className="w-4 h-4 text-amber-500" />;
      case 'archived':
        return <FileText className="w-4 h-4 text-gray-500" />;
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
        <div className="text-muted-foreground">Loading PRDs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={loadPRDs} variant="outline">Retry</Button>
      </div>
    );
  }

  if (prds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No PRDs yet</h3>
        <p className="text-muted-foreground mb-4">Create your first PRD by typing "/prd" in the search bar</p>
        <Button onClick={() => navigate('/dashboard')} variant="outline">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of the list when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={(e) => {
                e.preventDefault();
                handlePageChange(i);
              }}
              isActive={currentPage === i}
              className={cn(
                "cursor-pointer",
                currentPage === i && "bg-muted text-foreground border-border/60"
              )}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(1);
            }}
            isActive={currentPage === 1}
            className={cn(
              "cursor-pointer",
              currentPage === 1 && "bg-muted text-foreground border-border/60"
            )}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Calculate start and end of visible pages
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're near the start
      if (currentPage <= 3) {
        endPage = Math.min(4, totalPages - 1);
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 3);
      }

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Add visible pages
      for (let i = startPage; i <= endPage; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={(e) => {
                e.preventDefault();
                handlePageChange(i);
              }}
              isActive={currentPage === i}
              className={cn(
                "cursor-pointer",
                currentPage === i && "bg-muted text-foreground border-border/60"
              )}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show last page
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(totalPages);
            }}
            isActive={currentPage === totalPages}
            className={cn(
              "cursor-pointer",
              currentPage === totalPages && "bg-muted text-foreground border-border/60"
            )}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-6 space-y-6 bg-card/40 dark:bg-card/20 rounded-2xl border border-border/60 transition-colors">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">My PRDs</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="[&_[data-highlighted]]:bg-muted [&_[data-state=checked]]:bg-muted [&_[data-state=checked]]:text-foreground">
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {paginatedGroups.map(([groupId, versions]) => {
            const title = versions[0]?.title || 'Untitled';
            return (
              <div key={groupId} className="border border-border/60 rounded-xl p-4 bg-card/80 dark:bg-card/40 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
                    {versions.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleCreateVersion(versions[0].id)}
                            disabled={creatingVersion === versions[0].id}
                            className="p-2 rounded-md border border-border/60 hover:border-border/80 text-muted-foreground hover:text-foreground disabled:opacity-50"
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
                          className="p-2 rounded-md border border-red-500/30 text-red-500 hover:text-red-400 hover:border-red-500/60"
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
                      className="group flex items-center justify-between p-3 rounded-lg bg-muted/40 dark:bg-muted/20 border border-border/60 hover:border-border/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(prd.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-medium">v{prd.version}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground capitalize">
                              {prd.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
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
                            className="opacity-0 group-hover:opacity-100 p-2 rounded-md text-red-500 hover:text-red-400 transition-opacity"
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

        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-4 pt-4 border-t border-border/60">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {renderPaginationItems()}
                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, totalGroups)} of {totalGroups} PRD{totalGroups !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

