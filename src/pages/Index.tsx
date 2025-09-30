'use client';

import React from 'react';
import SearchInterface from '@/components/SearchInterface';
import UserProfile from '@/components/UserProfile';

const Index = () => {
  return (
    <div className="relative min-h-screen">
      {/* User profile in top-right */}
      <UserProfile />
      
      {/* Main search interface */}
      <SearchInterface />
    </div>
  );
};

export default Index;
