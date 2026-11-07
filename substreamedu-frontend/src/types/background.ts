export type BackgroundState = 'blur' | 'loaded' | 'fallback' | 'remove';

export interface BackgroundImageConfig {
  src: string;
  timeout: number;
  maxRetries: number;
  cacheKey: string;
}

export interface ConnectionInfo {
  effectiveType?: string;
  saveData?: boolean;
}

export interface BackgroundLoadOptions {
  checkConnection?: boolean;
  progressiveLoading?: boolean;
  fallbackGradient?: string;
}

export const DEFAULT_BACKGROUND_CONFIG: BackgroundImageConfig = {
  src: '/background.png',
  timeout: 3000,
  maxRetries: 3,
  cacheKey: 'backgroundVersion'
};

export const IMAGE_FORMATS = ['avif', 'webp', 'jpg'] as const;
export type ImageFormat = typeof IMAGE_FORMATS[number];

export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  laptop: 1366,
  desktop: 1920
} as const;