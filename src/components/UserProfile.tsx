

import React, { useState, useEffect } from 'react';
import { Settings, User, LogOut, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

const UserProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<{ name?: string; avatar_url?: string } | null>(null);

  const handleLogout = () => {
    logout();
  };

  const handleConnectedSources = (e?: Event) => {
    e?.preventDefault();
    e?.stopPropagation();
    navigate('/connected-sources');
  };

  const handleProfileSettings = () => {
    console.log('⚙️ Navigating to profile settings...');
    navigate('/profile-settings');
  };

  const handleClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`🔗 Navigating to ${path}`);
    navigate(path);
  };

  // Fetch profile data to show avatar and name
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          console.log('📸 Profile data loaded:', data); // Debug log
          setProfileData({
            name: data.name || undefined,
            avatar_url: data.avatar_url || undefined,
          });
        } else {
          console.log('❌ No profile data found or error:', error);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      console.log('🔄 Profile update event received, refetching...');
      fetchProfile();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user]);

  return (
    <div className="flex items-center gap-4">
        {/* Settings button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => handleClick(e, '/profile-settings')}
          className="h-10 w-10 rounded-full bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80 transition-all duration-200 flex items-center justify-center"
        >
          <Settings className="w-5 h-5" />
        </Button>

        {/* User avatar with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 w-10 rounded-full p-0 bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80 transition-all duration-200 flex items-center justify-center"
            >
                     <Avatar className="h-8 w-8">
                       <AvatarImage 
                         key={profileData?.avatar_url || 'no-avatar'}
                         src={profileData?.avatar_url || ''} 
                         alt={profileData?.name || 'User'}
                         className="object-cover"
                         onError={(e) => {
                           console.log('❌ Avatar image failed to load:', profileData?.avatar_url);
                         }}
                         onLoad={() => {
                           console.log('✅ Avatar image loaded successfully:', profileData?.avatar_url);
                         }}
                       />
                       <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                         {profileData?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                       </AvatarFallback>
                     </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 bg-card/95 backdrop-blur-sm border-border/50 z-[9999] shadow-lg"
            sideOffset={8}
            alignOffset={-8}
          >
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground truncate">
                {profileData?.name || user?.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profileData?.name ? user?.email : (user?.email_confirmed_at ? 'Verified' : 'Unverified')}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="hover:bg-accent/50 cursor-pointer" 
              onClick={(e) => handleClick(e, '/profile-settings')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="hover:bg-accent/50 cursor-pointer" 
              onClick={(e) => handleClick(e, '/connected-sources')}
            >
              <Link className="w-4 h-4 mr-2" />
              Connected Sources
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="hover:bg-destructive/10 text-destructive hover:text-destructive cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
};

export default UserProfile;