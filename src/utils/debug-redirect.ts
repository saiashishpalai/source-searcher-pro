// Debug utility to check redirect URL configuration
export const debugRedirectUrl = () => {
  const viteAppUrl = import.meta.env.VITE_APP_URL;
  const windowOrigin = window.location.origin;
  const finalUrl = viteAppUrl || windowOrigin;
  
  console.log('🔍 Redirect URL Debug Info:');
  console.log('- VITE_APP_URL:', viteAppUrl);
  console.log('- window.location.origin:', windowOrigin);
  console.log('- Final redirect URL:', finalUrl);
  console.log('- Full redirect URL:', `${finalUrl}/verify-email`);
  
  return {
    viteAppUrl,
    windowOrigin,
    finalUrl,
    fullRedirectUrl: `${finalUrl}/verify-email`
  };
};

// Test function to verify the redirect URL
export const testRedirectUrl = () => {
  const debug = debugRedirectUrl();
  
  if (debug.viteAppUrl) {
    console.log('✅ VITE_APP_URL is set:', debug.viteAppUrl);
  } else {
    console.log('❌ VITE_APP_URL is not set, falling back to:', debug.windowOrigin);
  }
  
  return debug;
};
