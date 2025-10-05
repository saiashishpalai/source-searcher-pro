// Environment variable utility that works in both Vite and Next.js

export function getEnvVar(key: string, fallback?: string): string | undefined {
  // Check for Vite environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteValue = import.meta.env[key];
    if (viteValue) return viteValue;
  }
  
  // Check for Next.js environment variables
  if (typeof process !== 'undefined' && process.env) {
    const nextValue = process.env[key];
    if (nextValue) return nextValue;
  }
  
  return fallback;
}

export function isDev(): boolean {
  // Vite dev check
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV !== undefined) {
    return import.meta.env.DEV;
  }
  
  // Next.js dev check
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== undefined) {
    return process.env.NODE_ENV === 'development';
  }
  
  return false;
}
