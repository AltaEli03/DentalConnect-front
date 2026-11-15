export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const themeStorageKey = 'dentalconnect-theme';

export function readThemePreference(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): ThemePreference {
  try {
    const value = storage.getItem(themeStorageKey);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

export function applyTheme(
  resolved: ResolvedTheme,
  root: HTMLElement = document.documentElement,
  meta: HTMLMetaElement | null = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  ),
) {
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  meta?.setAttribute('content', resolved === 'dark' ? '#08181d' : '#003b4a');
}
