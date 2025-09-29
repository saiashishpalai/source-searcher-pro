import React from 'react';
import { Settings, User, LogOut } from 'lucide-react';
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

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="fixed top-6 right-6 z-50 animate-fade-in">
      <div className="flex items-center gap-3">
        {/* Settings button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80 transition-all duration-200"
        >
          <Settings className="h-5 w-5" />
        </Button>

        {/* User avatar with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 w-10 rounded-full p-0 bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80 transition-all duration-200"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src="/api/placeholder/32/32" alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.email?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-sm border-border/50">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">
                {user?.isVerified ? 'Verified' : 'Unverified'}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="hover:bg-accent/50">
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-accent/50">
              Connected Sources
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-accent/50">
              Search History
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="hover:bg-destructive/10 text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default UserProfile;