import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, Trash2, TestTube } from 'lucide-react';
import { getStoredWebhookLogs, clearStoredWebhookLogs } from '@/lib/webhook-sync';

const N8nDebugPanel: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [lastSync, setLastSync] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const loadLogs = () => {
    const storedLogs = getStoredWebhookLogs();
    setLogs(storedLogs);
    
    try {
      const sync = localStorage.getItem('last_n8n_sync_attempt');
      if (sync) {
        setLastSync(JSON.parse(sync));
      }
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    loadLogs();
    
    // Refresh logs every 2 seconds
    const interval = setInterval(loadLogs, 2000);
    
    // Also listen for storage changes
    const handleStorageChange = () => {
      loadLogs();
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for same-tab updates
    window.addEventListener('n8n-log-updated', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('n8n-log-updated', handleStorageChange);
    };
  }, []);

  const handleClear = () => {
    clearStoredWebhookLogs();
    localStorage.removeItem('last_n8n_sync_attempt');
    loadLogs();
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      if ((window as any).testN8nWebhook) {
        await (window as any).testN8nWebhook();
        setTimeout(loadLogs, 1000); // Reload logs after test
      } else {
        alert('Test function not available. Check console for testN8nWebhook()');
      }
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700"
      >
        Show n8n Debug
      </button>
    );
  }

  const latestLog = logs[logs.length - 1];
  const hasErrors = logs.some((log: any) => log.level === 'error');

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] bg-background border-2 border-red-500 rounded-lg shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-red-600 text-white p-3 flex items-center justify-between">
        <div className="font-bold text-sm">
          🔧 n8n Webhook Debug Panel
          {hasErrors && <span className="ml-2">⚠️ ERRORS DETECTED</span>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTest}
            disabled={testing}
            className="h-6 w-6 p-0 text-white hover:bg-red-700"
            title="Test webhook connection"
          >
            <TestTube className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadLogs}
            className="h-6 w-6 p-0 text-white hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-6 w-6 p-0 text-white hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-6 w-6 p-0 text-white hover:bg-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1 space-y-3">
        {/* Last Sync Status */}
        {lastSync && (
          <Alert variant={lastSync.status === 'failed' ? 'destructive' : 'default'}>
            <AlertTitle className="text-xs font-bold">
              Last Sync: {new Date(lastSync.timestamp).toLocaleTimeString()}
            </AlertTitle>
            <AlertDescription className="text-xs mt-1">
              <div>Email: {lastSync.email}</div>
              <div>Status: <strong>{lastSync.status}</strong></div>
              {lastSync.error && (
                <div className="mt-2 text-red-600 dark:text-red-400">
                  Error: {lastSync.error}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Logs */}
        {logs.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No logs yet. Try signing up a user.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground mb-2">
              Recent Logs ({logs.length}):
            </div>
            {logs.slice(-10).reverse().map((log: any, index: number) => (
              <Alert
                key={index}
                variant={log.level === 'error' ? 'destructive' : 'default'}
                className="text-xs"
              >
                <AlertTitle className="text-xs">
                  [{log.level.toUpperCase()}] {new Date(log.timestamp).toLocaleTimeString()}
                </AlertTitle>
                <AlertDescription className="text-xs mt-1 whitespace-pre-wrap break-words">
                  {log.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-muted p-2 text-xs text-center text-muted-foreground border-t">
        Auto-refreshing every 2s • {logs.length} total logs
      </div>
    </div>
  );
};

export default N8nDebugPanel;

