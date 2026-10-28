declare module '*.css';

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_BASE_URL?: string;
  }
}

// Expo inlines `process.env.EXPO_PUBLIC_*` at build time.
declare const process: {
  env: NodeJS.ProcessEnv;
};

interface Window {
  gtag?: (...args: unknown[]) => void;
  psOpenConsent?: () => void;
}
