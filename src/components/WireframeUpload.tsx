import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, Image as ImageIcon, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { analytics } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { getEnvVar } from '@/lib/env';

interface WireframeUploadProps {
  onUpload: (file: File, preview: string, storageUrl: string) => void;
  onRemove: () => void;
  uploadedFile?: { file: File; preview: string; storageUrl?: string } | null;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  disabled?: boolean;
}

export function WireframeUpload({
  onUpload,
  onRemove,
  uploadedFile = null,
  maxSizeMB = 10,
  acceptedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
  disabled = false
}: WireframeUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      const acceptedExtensions = acceptedFormats
        .map(format => format.split('/')[1].toUpperCase())
        .join(', ');
      return `Unsupported file type. Please upload ${acceptedExtensions}.`;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File size exceeds ${maxSizeMB}MB limit. Please upload a smaller file.`;
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsUploading(true);

      // Create preview
      const preview = URL.createObjectURL(file);

      // Upload to Supabase Storage - use user from AuthContext
      if (!user?.id) {
        console.error('[WireframeUpload] No authenticated user found');
        setError('You must be logged in to upload wireframes. Please sign in and try again.');
        return;
      }
      
      console.log('[WireframeUpload] Authenticated user:', user.id);

      const fileExt = file.name.split('.').pop() || 'png';
      const filePath = `${user.id}-${Date.now()}.${fileExt}`; // Flat filename: userId-timestamp.ext

      console.log('[WireframeUpload] Attempting upload', {
        userId: user.id,
        filePath,
        fileType: file.type,
        fileSize: file.size
      });

      // Upload via backend to avoid client-side JWT/origin issues
      const form = new FormData();
      form.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      
      // Get the API base URL (Render backend in production, localhost in dev)
      const API_BASE_URL = import.meta.env.DEV 
        ? (import.meta.env.VITE_API_URL || '') 
        : (getEnvVar('VITE_API_URL') || 'https://source-searcher-pro.onrender.com');
      
      const resp = await fetch(`${API_BASE_URL}/api/storage/upload-wireframe`, {
        method: 'POST',
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: form,
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        const msg = errJson?.error || 'Upload failed';
        console.error('[WireframeUpload] Backend upload failed:', msg);
        setError(msg);
        return;
      }
      const result = await resp.json();
      const publicUrl = result?.url;
      const serverPath = result?.path;

      console.log('[WireframeUpload] Upload successful', { serverPath, publicUrl });

      // Track analytics
      analytics.trackWireframeUpload(file.size, file.type);

      // Call parent callback
      onUpload(file, preview, publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload wireframe');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = () => {
    if (uploadedFile?.preview) {
      URL.revokeObjectURL(uploadedFile.preview);
    }
    analytics.trackWireframeRemove();
    onRemove();
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  if (uploadedFile) {
    return (
      <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <div className="relative rounded-xl border border-white/15 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 overflow-hidden group">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Success shimmer effect */}
          {uploadedFile.storageUrl && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" 
                 style={{ animation: 'shimmer 2s infinite' }} />
          )}
          
          <div className="relative flex items-start gap-4">
            {/* Preview thumbnail with hover effect */}
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/5 group-hover:scale-105 transition-transform duration-300">
              {uploadedFile.file.type.startsWith('image/') ? (
                <img
                  src={uploadedFile.preview}
                  alt="Wireframe preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-white/40" />
                </div>
              )}
              
              {/* Success badge overlay */}
              {uploadedFile.storageUrl && (
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/30 to-transparent flex items-end justify-center pb-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300 drop-shadow-lg animate-in zoom-in-50 duration-300" />
                </div>
              )}
            </div>

            {/* File info with animations */}
            <div className="flex-1 min-w-0 py-1">
              <div className="flex items-start gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5 animate-pulse" />
                <p className="text-sm font-medium text-white truncate">
                  {uploadedFile.file.name}
                </p>
              </div>
              <p className="text-xs text-white/50 mb-2">
                {(uploadedFile.file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              {uploadedFile.storageUrl && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in-0 slide-in-from-left-2 duration-300">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-300">Ready for AI analysis</span>
                </div>
              )}
            </div>

            {/* Remove button with hover effect */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              disabled={disabled}
              className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 hover:scale-110 transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative rounded-xl border-2 border-dashed overflow-hidden transition-all duration-300 ${
          isDragging
            ? 'border-violet-400/60 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-violet-500/10 scale-[1.02]'
            : 'border-white/20 bg-gradient-to-br from-white/[0.04] to-white/[0.02]'
        } ${
          disabled 
            ? 'cursor-not-allowed opacity-50' 
            : 'cursor-pointer hover:border-white/35 hover:bg-gradient-to-br hover:from-white/[0.06] hover:to-white/[0.03] hover:scale-[1.01]'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-fuchsia-500/5 to-violet-500/0 opacity-0 group-hover:opacity-100 animate-pulse" />
        
        {/* Sparkle effects on drag */}
        {isDragging && (
          <>
            <div className="absolute top-4 left-4 animate-ping">
              <Sparkles className="h-3 w-3 text-violet-400" />
            </div>
            <div className="absolute top-4 right-4 animate-ping animation-delay-200">
              <Sparkles className="h-3 w-3 text-fuchsia-400" />
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-ping animation-delay-400">
              <Sparkles className="h-3 w-3 text-violet-400" />
            </div>
          </>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInput}
          disabled={disabled || isUploading}
          className="hidden"
        />

        <div className="relative flex flex-col items-center justify-center p-10 text-center">
          {isUploading ? (
            <div className="animate-in fade-in-0 zoom-in-50 duration-300">
              <div className="relative mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-violet-400" />
                <div className="absolute inset-0 h-12 w-12 animate-ping text-violet-400/20">
                  <Loader2 className="h-12 w-12" />
                </div>
              </div>
              <p className="text-sm font-medium text-white/80 mb-1">Uploading wireframe...</p>
              <div className="flex items-center gap-1 justify-center mt-2">
                <div className="h-1 w-1 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-1 w-1 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-1 w-1 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in-0 duration-300">
              <div className="relative mb-4 group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
                <div className="relative flex items-center justify-center h-14 w-14 rounded-full border border-white/15 bg-gradient-to-br from-white/10 to-white/5 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="h-7 w-7 text-white/70 group-hover:text-white transition-colors duration-300" />
                </div>
              </div>
              
              <div className="flex items-center gap-2 justify-center mb-2">
                <Sparkles className="h-4 w-4 text-violet-400 animate-pulse" />
                <p className="text-sm font-semibold text-white/90">
                  Upload Wireframe
                </p>
                <Sparkles className="h-4 w-4 text-fuchsia-400 animate-pulse animation-delay-300" />
              </div>
              
              <p className="text-sm text-white/60 mb-1">
                {isDragging ? 'Drop to upload' : 'Drag and drop or click to select'}
              </p>
              
              <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-white/50">PNG, JPG, PDF</span>
                </div>
                <div className="h-3 w-px bg-white/10" />
                <span className="text-xs text-white/50">Max {maxSizeMB}MB</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 animate-in fade-in-0 slide-in-from-top-2 duration-300 flex items-start gap-2">
          <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

