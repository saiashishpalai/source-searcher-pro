import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { analytics } from '@/lib/analytics';

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

      // Upload to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileExt = file.name.split('.').pop() || 'png';
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('wireframes')
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        throw new Error(uploadError.message || 'Unable to upload wireframe');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('wireframes')
        .getPublicUrl(filePath);

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
      <div className="space-y-3">
        <div className="relative rounded-xl border border-white/15 bg-white/[0.03] p-4">
          <div className="flex items-start gap-4">
            {/* Preview thumbnail */}
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
              {uploadedFile.file.type.startsWith('image/') ? (
                <img
                  src={uploadedFile.preview}
                  alt="Wireframe preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-white/40" />
                </div>
              )}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {uploadedFile.file.name}
              </p>
              <p className="text-xs text-white/50 mt-1">
                {(uploadedFile.file.size / 1024).toFixed(1)} KB
              </p>
              {uploadedFile.storageUrl && (
                <p className="text-xs text-emerald-300/70 mt-1">✓ Uploaded</p>
              )}
            </div>

            {/* Remove button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              disabled={disabled}
              className="h-8 w-8 rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-red-500/20 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-white/40 bg-white/10'
            : 'border-white/20 bg-white/[0.03]'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-white/30 hover:bg-white/[0.05]'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInput}
          disabled={disabled || isUploading}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center p-8 text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-white/40 mb-3" />
              <p className="text-sm font-medium text-white/70">Uploading wireframe...</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-white/40 mb-3" />
              <p className="text-sm font-medium text-white/80 mb-1">
                Upload Wireframe
              </p>
              <p className="text-xs text-white/50">
                Drag and drop or click to select
              </p>
              <p className="text-xs text-white/40 mt-2">
                PNG, JPG, PDF • Max {maxSizeMB}MB
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

