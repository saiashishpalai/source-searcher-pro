import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DuplicateInfo {
  document_id: string;
  title: string;
  source_type: string;
  similarity_score: string;
  synced_at: string;
}

interface DuplicateAlertProps {
  document: {
    id: string;
    document_id?: string;
    potential_duplicates?: DuplicateInfo[];
    metadata?: {
      potential_duplicates?: DuplicateInfo[];
    };
  };
  onLinkVersions: (newerDocId: string, olderDocId: string) => void;
  onDismiss: (documentId: string, duplicateId: string) => void;
}

const DuplicateAlert: React.FC<DuplicateAlertProps> = ({
  document,
  onLinkVersions,
  onDismiss
}) => {
  // Check both top-level and metadata for potential_duplicates
  const duplicates = document.potential_duplicates || document.metadata?.potential_duplicates || [];
  const [loadingStates, setLoadingStates] = useState<Record<string, 'idle' | 'linking' | 'dismissing' | 'success' | 'error'>>({});
  
  // Simple localStorage persistence for user selections
  const getStoredSelections = (): Record<string, 'linked' | 'dismissed'> => {
    try {
      const stored = localStorage.getItem('duplicate-selections');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };
  
  const [userSelections, setUserSelections] = useState<Record<string, 'linked' | 'dismissed'>>(getStoredSelections());
  
  // Debug logging
  console.log('🔍 DuplicateAlert received document:', document);
  console.log('🔍 potential_duplicates from document:', document.potential_duplicates);
  console.log('🔍 potential_duplicates from metadata:', document.metadata?.potential_duplicates);
  console.log('🔍 final duplicates array:', duplicates);
  
  if (duplicates.length === 0) {
    console.log('❌ No duplicates found, returning null');
    return null;
  }

  const handleLinkVersions = async (duplicateId: string) => {
    const actionKey = `${document.document_id || document.id}-${duplicateId}`;
    setLoadingStates(prev => ({ ...prev, [actionKey]: 'linking' }));
    
    try {
      await onLinkVersions(document.document_id || document.id, duplicateId);
      setLoadingStates(prev => ({ ...prev, [actionKey]: 'success' }));
      
      // Save user selection permanently
      const newSelections = { ...userSelections, [actionKey]: 'linked' as const };
      setUserSelections(newSelections);
      localStorage.setItem('duplicate-selections', JSON.stringify(newSelections));
      
    } catch (error) {
      setLoadingStates(prev => ({ ...prev, [actionKey]: 'error' }));
      // Reset error state after 3 seconds
      setTimeout(() => {
        setLoadingStates(prev => ({ ...prev, [actionKey]: 'idle' }));
      }, 3000);
    }
  };

  const handleDismiss = async (duplicateId: string) => {
    const actionKey = `${document.document_id || document.id}-${duplicateId}`;
    setLoadingStates(prev => ({ ...prev, [actionKey]: 'dismissing' }));
    
    try {
      await onDismiss(document.document_id || document.id, duplicateId);
      setLoadingStates(prev => ({ ...prev, [actionKey]: 'success' }));
      
      // Save user selection permanently
      const newSelections = { ...userSelections, [actionKey]: 'dismissed' as const };
      setUserSelections(newSelections);
      localStorage.setItem('duplicate-selections', JSON.stringify(newSelections));
      
    } catch (error) {
      setLoadingStates(prev => ({ ...prev, [actionKey]: 'error' }));
      // Reset error state after 3 seconds
      setTimeout(() => {
        setLoadingStates(prev => ({ ...prev, [actionKey]: 'idle' }));
      }, 3000);
    }
  };
  
  return (
    <Alert className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 animate-in slide-in-from-top-2 duration-300">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Similar document found
          </p>
          
          {duplicates.map((duplicate, index) => {
            const actionKey = `${document.document_id || document.id}-${duplicate.document_id}`;
            const loadingState = loadingStates[actionKey] || 'idle';
            const userSelection = userSelections[actionKey];
            
            // Show what user already selected
            if (userSelection === 'linked') {
              return (
                <div key={duplicate.document_id} className="space-y-2">
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <p className="font-medium">
                      ✅ {duplicate.title} - Already linked as same document
                    </p>
                    <p className="text-xs opacity-75">
                      {duplicate.source_type} • {duplicate.similarity_score}% similar
                    </p>
                  </div>
                </div>
              );
            }
            
            if (userSelection === 'dismissed') {
              return (
                <div key={duplicate.document_id} className="space-y-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p className="font-medium">
                      ❌ {duplicate.title} - Dismissed as different document
                    </p>
                    <p className="text-xs opacity-75">
                      {duplicate.source_type} • {duplicate.similarity_score}% similar
                    </p>
                  </div>
                </div>
              );
            }
            
            return (
              <div key={duplicate.document_id} className="space-y-2">
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium">
                    {duplicate.title}
                  </p>
                  <p className="text-xs opacity-75">
                    {duplicate.source_type} • {duplicate.similarity_score}% similar
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={loadingState !== 'idle'}
                    className={`text-xs px-3 py-1 transition-all duration-200 ${
                      loadingState === 'linking' 
                        ? 'bg-yellow-500 cursor-not-allowed' 
                        : loadingState === 'success'
                        ? 'bg-green-600 hover:bg-green-700'
                        : loadingState === 'error'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-yellow-600 hover:bg-yellow-700'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleLinkVersions(duplicate.document_id);
                    }}
                  >
                    {loadingState === 'linking' && (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    )}
                    {loadingState === 'success' && (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    )}
                    {loadingState === 'error' && (
                      <XCircle className="w-3 h-3 mr-1" />
                    )}
                    {loadingState === 'linking' ? 'Linking...' : 
                     loadingState === 'success' ? 'Linked!' :
                     loadingState === 'error' ? 'Failed' :
                     'These are the same document'}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingState !== 'idle'}
                    className={`text-xs px-3 py-1 transition-all duration-200 ${
                      loadingState === 'dismissing' 
                        ? 'border-yellow-400 cursor-not-allowed' 
                        : loadingState === 'success'
                        ? 'border-green-500 text-green-700 bg-green-50'
                        : loadingState === 'error'
                        ? 'border-red-500 text-red-700 bg-red-50'
                        : 'border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDismiss(duplicate.document_id);
                    }}
                  >
                    {loadingState === 'dismissing' && (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    )}
                    {loadingState === 'success' && (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    )}
                    {loadingState === 'error' && (
                      <XCircle className="w-3 h-3 mr-1" />
                    )}
                    {loadingState === 'dismissing' ? 'Dismissing...' : 
                     loadingState === 'success' ? 'Dismissed!' :
                     loadingState === 'error' ? 'Failed' :
                     'These are different'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default DuplicateAlert;
