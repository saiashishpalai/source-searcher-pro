
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, 
  Camera, 
  Loader2, 
  User, 
  Mail, 
  Briefcase, 
  Building2,
  Save,
  CheckCircle2,
  Upload,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileData {
  name: string;
  email: string;
  avatar_url: string;
  role: string;
  organization: string;
}

interface ValidationErrors {
  name?: string;
  role?: string;
  organization?: string;
}

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const [formData, setFormData] = useState<ProfileData>({
    name: '',
    email: '',
    avatar_url: '',
    role: '',
    organization: '',
  });

  const [originalData, setOriginalData] = useState<ProfileData>({
    name: '',
    email: '',
    avatar_url: '',
    role: '',
    organization: '',
  });

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const profileData: ProfileData = {
          name: data?.name || '',
          email: data?.email || user.email || '',
          avatar_url: data?.avatar_url || '',
          role: data?.role || '',
          organization: data?.organization || '',
        };

        setFormData(profileData);
        setOriginalData(profileData);
        setImagePreview(profileData.avatar_url);
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Check for changes
  useEffect(() => {
    const hasChanged = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(hasChanged);
  }, [formData, originalData]);

  // Validate field
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        if (value.trim().length > 50) return 'Name must be less than 50 characters';
        break;
      case 'role':
        if (value && value.length > 50) return 'Role must be less than 50 characters';
        break;
      case 'organization':
        if (value && value.length > 100) return 'Organization must be less than 100 characters';
        break;
    }
    return undefined;
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Inline validation
    const error = validateField(name, value);
    setValidationErrors(prev => ({
      ...prev,
      [name]: error,
    }));
  };

  // Handle image upload
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingImage(true);

      // Create preview first (synchronously)
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      // Update form data with the permanent URL
      setFormData(prev => ({
        ...prev,
        avatar_url: publicUrl,
      }));

      // Update preview to use the permanent URL
      URL.revokeObjectURL(previewUrl); // Clean up the temporary URL
      setImagePreview(publicUrl);

      toast({
        title: 'Image uploaded',
        description: 'Profile photo preview updated. Click Save Changes to apply.',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
      setImagePreview(formData.avatar_url);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!user) return;

    // Validate all fields
    const errors: ValidationErrors = {};
    Object.keys(formData).forEach((key) => {
      if (key !== 'email' && key !== 'avatar_url') {
        const error = validateField(key, formData[key as keyof ProfileData]);
        if (error) errors[key as keyof ValidationErrors] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({
        title: 'Validation error',
        description: 'Please fix the errors before saving',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          avatar_url: formData.avatar_url,
          role: formData.role.trim(),
          organization: formData.organization.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setOriginalData(formData);
      setHasChanges(false);

      // Trigger a custom event to refresh the UserProfile component
      window.dispatchEvent(new CustomEvent('profileUpdated'));

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData(prev => ({
      ...prev,
      avatar_url: '',
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl animate-background-drift" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-accent/8 to-primary/5 rounded-full blur-3xl animate-background-drift" style={{ animationDelay: '10s' }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-border/30 bg-background/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 animate-fade-in"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                </Button>
                <Separator orientation="vertical" className="h-6 hidden sm:block" />
                <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-semibold text-foreground">Profile Settings</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your account information</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
            {/* Profile Photo Section */}
            <Card className="bg-card/60 backdrop-blur-sm border-border/50 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Profile Photo
                </CardTitle>
                <CardDescription>
                  Upload a profile picture or sync from Google
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Avatar preview with hover animation */}
                  <div className="relative group">
                    <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-border/50 transition-transform duration-300 group-hover:scale-105">
                      <AvatarImage src={imagePreview || ''} alt="Profile" />
                      <AvatarFallback className="bg-primary/20 text-primary text-2xl sm:text-4xl font-semibold">
                        {formData.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {imagePreview && (
                      <button
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/90"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Upload buttons */}
                  <div className="flex-1 space-y-3 w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full sm:w-auto transition-all duration-200 hover:scale-[1.02]"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photo
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Recommended: Square image, at least 400x400px. Max 5MB.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information Section */}
            <Card className="bg-card/60 backdrop-blur-sm border-border/50 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-foreground flex items-center gap-2">
                    Name <span className="text-destructive">*</span>
                    {validationErrors.name && (
                      <span className="text-xs text-destructive font-normal">{validationErrors.name}</span>
                    )}
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className={`pl-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 ${
                        validationErrors.name ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Email field (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-2">
                    Email
                    <span className="text-xs text-muted-foreground font-normal">(Read-only)</span>
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      readOnly
                      className="pl-10 bg-muted/30 border-border/30 cursor-not-allowed text-muted-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed as it's linked to your login
                  </p>
                </div>

                <Separator />

                {/* Role field */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-foreground flex items-center gap-2">
                    Role / Designation
                    <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    {validationErrors.role && (
                      <span className="text-xs text-destructive font-normal">{validationErrors.role}</span>
                    )}
                  </Label>
                  <div className="relative group">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="role"
                      name="role"
                      type="text"
                      value={formData.role}
                      onChange={handleInputChange}
                      placeholder="e.g. Software Engineer, Product Manager"
                      className={`pl-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 ${
                        validationErrors.role ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Organization field */}
                <div className="space-y-2">
                  <Label htmlFor="organization" className="text-sm font-medium text-foreground flex items-center gap-2">
                    Organization
                    {validationErrors.organization && (
                      <span className="text-xs text-destructive font-normal">{validationErrors.organization}</span>
                    )}
                  </Label>
                  <div className="relative group">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="organization"
                      name="organization"
                      type="text"
                      value={formData.organization}
                      onChange={handleInputChange}
                      placeholder="e.g. Acme Corporation"
                      className={`pl-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 ${
                        validationErrors.organization ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''
                      }`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button - Sticky on mobile */}
            <div className="sticky bottom-4 sm:static animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {hasChanges && (
                        <span className="flex items-center gap-2 text-amber-500 animate-fade-in">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                          You have unsaved changes
                        </span>
                      )}
                      {!hasChanges && (
                        <span className="flex items-center gap-2 text-green-500">
                          <CheckCircle2 className="w-4 h-4" />
                          All changes saved
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving || Object.keys(validationErrors).some(key => validationErrors[key as keyof ValidationErrors])}
                      className="w-full sm:w-auto group relative bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                    >
                      {/* Animated background shimmer */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                      
                      {/* Button content */}
                      <span className="relative flex items-center justify-center gap-2">
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;

