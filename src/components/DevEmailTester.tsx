import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { testEmailVerification, devHelpers } from '@/utils/test-email-verification';
import { TestTube, Trash2, Copy, ExternalLink } from 'lucide-react';

const DevEmailTester = () => {
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateTestUser = async () => {
    setIsLoading(true);
    try {
      const result = await testEmailVerification.createTestUser();
      setTestEmail(result.email);
      console.log('✅ Test user created successfully');
    } catch (error) {
      console.error('❌ Failed to create test user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateVerification = () => {
    const testUrl = testEmailVerification.simulateVerification();
    navigator.clipboard.writeText(testUrl);
    alert('Test URL copied to clipboard!');
  };

  const handleLogEnvironment = () => {
    devHelpers.logEnvironment();
    alert('Environment info logged to console');
  };

  const handleTestRedirectUrl = () => {
    const redirectUrl = devHelpers.testRedirectUrl();
    navigator.clipboard.writeText(redirectUrl);
    alert('Redirect URL copied to clipboard!');
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8 border-orange-200 bg-orange-50/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600">
          <TestTube className="w-5 h-5" />
          Email Verification Tester (Dev Only)
        </CardTitle>
        <CardDescription>
          Tools to test email verification flow without creating real accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Environment Info */}
        <div className="space-y-2">
          <Label>Environment Info</Label>
          <div className="flex gap-2">
            <Button onClick={handleLogEnvironment} variant="outline" size="sm">
              Log to Console
            </Button>
            <Button onClick={handleTestRedirectUrl} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-1" />
              Copy Redirect URL
            </Button>
          </div>
        </div>

        {/* Test User Creation */}
        <div className="space-y-2">
          <Label>Create Test User</Label>
          <div className="flex gap-2">
            <Button 
              onClick={handleCreateTestUser} 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Creating...' : 'Create Test User'}
            </Button>
            {testEmail && (
              <Button 
                onClick={() => testEmailVerification.deleteTestUser(testEmail)}
                variant="destructive" 
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Cleanup
              </Button>
            )}
          </div>
          {testEmail && (
            <p className="text-sm text-gray-600">
              Test email: <code className="bg-gray-100 px-1 rounded">{testEmail}</code>
            </p>
          )}
        </div>

        {/* Simulation */}
        <div className="space-y-2">
          <Label>Simulate Verification</Label>
          <Button onClick={handleSimulateVerification} variant="outline">
            <ExternalLink className="w-4 h-4 mr-1" />
            Generate Test URL
          </Button>
        </div>

        {/* Quick Links */}
        <div className="space-y-2">
          <Label>Quick Test Links</Label>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => window.open('/verify-email?token=test&email=test@example.com', '_blank')}
              variant="outline" 
              size="sm"
            >
              Test Verify Page
            </Button>
            <Button 
              onClick={() => window.open('/connected-sources', '_blank')}
              variant="outline" 
              size="sm"
            >
              Test Connected Sources
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Instructions:</strong></p>
          <p>1. Use temporary email services (10minutemail.com, temp-mail.org)</p>
          <p>2. Create test user and check email for verification link</p>
          <p>3. Click verification link to test redirect flow</p>
          <p>4. Verify you're redirected to /connected-sources</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DevEmailTester;
