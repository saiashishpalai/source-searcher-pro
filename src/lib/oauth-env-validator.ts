import { getEnvVar } from './env';

export function validateOAuthEnvironment() {
  const providers = ['GOOGLE', 'SLACK', 'NOTION'];
  const issues: string[] = [];

  providers.forEach(provider => {
    const clientId = getEnvVar(`VITE_${provider}_CLIENT_ID`);
    if (!clientId || clientId.includes('your-') || clientId.includes('placeholder')) {
      issues.push(`${provider} client ID not configured`);
    }
  });

  return { isValid: issues.length === 0, issues };
}

export function logOAuthStatus() {
  const { isValid, issues } = validateOAuthEnvironment();
  if (!isValid) {
    console.error('❌ OAuth Configuration Issues:', issues);
    console.error('Please check your .env.local file and ensure VITE_ prefixed variables are set');
  } else {
    console.log('✅ OAuth environment configured correctly');
  }
}
