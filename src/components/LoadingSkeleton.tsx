
import React from 'react';
import { Sparkles } from 'lucide-react';

const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* AI Summary Loading Skeleton */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent rounded-2xl blur-xl opacity-60" />
        <div className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 lg:p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="space-y-2">
                <div className="h-5 bg-muted/30 rounded-lg w-32 animate-pulse" />
                <div className="h-4 bg-muted/20 rounded w-48 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 bg-muted/20 rounded w-16 animate-pulse" />
              <div className="h-4 bg-muted/20 rounded w-12 animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="h-4 bg-muted/20 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-muted/20 rounded w-full animate-pulse" />
            <div className="h-4 bg-muted/20 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Controls Loading Skeleton */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="h-8 bg-muted/20 rounded-lg w-16 animate-pulse" />
          <div className="h-8 bg-muted/20 rounded-lg w-20 animate-pulse" />
          <div className="h-8 bg-muted/20 rounded-lg w-18 animate-pulse" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 bg-muted/20 rounded w-20 animate-pulse" />
          <div className="h-8 bg-muted/20 rounded-lg w-32 animate-pulse" />
        </div>
      </div>

      {/* Source Sections Loading Skeleton */}
      <div className="space-y-6">
        {[1, 2, 3].map((sectionIndex) => (
          <div 
            key={sectionIndex}
            className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between p-4 bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted/30 rounded-lg animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 bg-muted/30 rounded w-24 animate-pulse" />
                  <div className="h-4 bg-muted/20 rounded w-16 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 bg-muted/20 rounded w-20 animate-pulse" />
                <div className="w-8 h-8 bg-muted/20 rounded animate-pulse" />
              </div>
            </div>

            {/* Result Cards Skeleton */}
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((cardIndex) => (
                <div 
                  key={cardIndex}
                  className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 animate-pulse"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-2">
                      <div className="h-6 bg-muted/20 rounded w-16 animate-pulse" />
                      <div className="h-6 bg-muted/20 rounded w-12 animate-pulse" />
                      <div className="h-6 bg-muted/20 rounded w-20 animate-pulse" />
                    </div>
                    <div className="h-4 bg-muted/20 rounded w-12 animate-pulse" />
                  </div>
                  
                  <div className="h-5 bg-muted/30 rounded w-3/4 mb-2 animate-pulse" />
                  <div className="space-y-2 mb-3">
                    <div className="h-4 bg-muted/20 rounded w-full animate-pulse" />
                    <div className="h-4 bg-muted/20 rounded w-2/3 animate-pulse" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-muted/20 rounded w-24 animate-pulse" />
                    <div className="w-8 h-8 bg-muted/20 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      <div className="flex justify-center pt-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading search results...</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;
