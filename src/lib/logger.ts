const isDev = import.meta.env.DEV;

export const logger = {
  oauth(message: string, data?: any) {
    if (isDev) {
      console.log(`[OAuth] ${message}`, data || '');
    }
  },
  
  auth(message: string, data?: any) {
    if (isDev) {
      console.log(`[Auth] ${message}`, data || '');
    }
  },
  
  api(message: string, data?: any) {
    if (isDev) {
      console.log(`[API] ${message}`, data || '');
    }
  },
  
  error(message: string, error: any) {
    console.error(`[ERROR] ${message}`, error);
  }
};
