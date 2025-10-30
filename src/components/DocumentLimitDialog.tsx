import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, FileText, Info } from 'lucide-react';

interface DocumentLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceType: string;
  processedCount: number;
  remainingFiles: number;
  onUpgrade?: () => void;
}

const DocumentLimitDialog: React.FC<DocumentLimitDialogProps> = ({
  isOpen,
  onClose,
  sourceType,
  processedCount,
  remainingFiles,
  onUpgrade
}) => {
  const getSourceName = (type: string) => {
    switch (type) {
      case 'google_drive': return 'Google Drive';
      case 'notion': return 'Notion';
      case 'slack': return 'Slack';
      default: return type;
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-full">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg">
                Document Limit Reached
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              You've reached the 200 document limit for {getSourceName(sourceType)}. 
              We've successfully processed <strong>{processedCount} documents</strong>.
            </p>
            
            {remainingFiles > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {remainingFiles} files were not processed
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  These files will be processed in your next sync session.
                </p>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <p className="font-medium">What happens next?</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Your processed documents are ready for search</li>
                <li>• Future syncs will process remaining files</li>
                <li>• You can manually trigger another sync anytime</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {onUpgrade && (
            <AlertDialogAction 
              onClick={onUpgrade}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              Upgrade Plan
            </AlertDialogAction>
          )}
          <AlertDialogCancel onClick={onClose} className="w-full sm:w-auto">
            Got it
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DocumentLimitDialog;
