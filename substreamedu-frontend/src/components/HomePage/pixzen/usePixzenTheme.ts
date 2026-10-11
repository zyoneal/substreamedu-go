import { useEffect } from 'react';

const PIXZEN_CLASS = 'pixzen';
const LIGHT_THEME_COLOR = '#F5F3EF';

/**
 * Scopes the Pixzen light editorial theme to the routes that mount it.
 * Tokens are defined on `body.pixzen` (see src/styles/pixzen.css), so the global
 * Header, portals and modals inherit them without touching other routes.
 */
export function usePixzenTheme(): void {
  useEffect(() => {
    const body = document.body;
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousThemeColor = themeMeta?.content ?? null;
    const previousBackground = body.style.backgroundColor;

    body.classList.add(PIXZEN_CLASS);
    body.style.backgroundColor = LIGHT_THEME_COLOR;
    if (themeMeta) themeMeta.content = LIGHT_THEME_COLOR;

    return () => {
      body.classList.remove(PIXZEN_CLASS);
      body.style.backgroundColor = previousBackground;
      if (themeMeta && previousThemeColor !== null) themeMeta.content = previousThemeColor;
    };
  }, []);
}
