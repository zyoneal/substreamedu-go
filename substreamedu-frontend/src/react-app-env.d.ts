/// <reference types="react-scripts" />

declare module 'lenis' {
  export interface LenisOptions {
    lerp?: number;
    duration?: number;
    orientation?: 'vertical' | 'horizontal';
    gestureOrientation?: 'vertical' | 'horizontal' | 'both';
    smoothWheel?: boolean;
    wheelMultiplier?: number;
    touchMultiplier?: number;
    infinite?: boolean;
    autoResize?: boolean;
    syncTouch?: boolean;
    [key: string]: unknown;
  }

  export default class Lenis {
    constructor(options?: LenisOptions);
    on(event: string, callback: (...args: unknown[]) => void): void;
    off(event: string, callback: (...args: unknown[]) => void): void;
    raf(time: number): void;
    destroy(): void;
    scrollTo(target: unknown, options?: unknown): void;
  }
}
