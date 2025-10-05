

import React from 'react';
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

const UserProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
    navigate('/connected-sources'); // For now, redirect to connected sources as it's the main settings page
  };

  const handleClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`🔗 Navigating to ${path}`);
    navigate(path);
  };

  return (
    <div className="flex items-center gap-4">
        {/* Settings button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => handleClick(e, '/connected-sources')}
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
                       <AvatarImage src="" alt="User" />
                       <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                         {user?.email?.charAt(0).toUpperCase() || 'U'}
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
              <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground">
                {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="hover:bg-accent/50 cursor-pointer" 
              onClick={(e) => handleClick(e, '/connected-sources')}
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