
const isDevelopment = process.env.NODE_ENV === 'development';

export const debugLog = (...args: unknown[]): void => {
    if (isDevelopment) {
        console.log(...args);
    }
};

export const debugWarn = (...args: unknown[]): void => {
    if (isDevelopment) {
        console.warn(...args);
    }
};

export const debugError = (...args: unknown[]): void => {
    console.error(...args);
};
