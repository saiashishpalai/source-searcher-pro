import { getEnvVar } from './env';

export function validateEnvVariables() {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter(key => !getEnvVar(key));

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}\n\n` +
      `Please create a .env.local file with these variables.`
    );
  }

  console.log('✓ All required environment variables are present');
}
