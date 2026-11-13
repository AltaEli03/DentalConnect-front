import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, readThemePreference, resolveTheme, themeStorageKey } from './theme';

describe('theme helpers', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });

  it('resolves system preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('reads a stored preference with a safe fallback', () => {
    expect(readThemePreference({ getItem: () => 'dark' })).toBe('dark');
    expect(readThemePreference({ getItem: () => null })).toBe('system');
    expect(readThemePreference({ getItem: () => 'invalid' })).toBe('system');
  });

  it('applies the dark class and updates the theme color', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#003b4a';
    applyTheme('dark', document.documentElement, meta);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(meta.content).toBe('#08181d');
  });

  it('uses the expected storage key', () => {
    expect(themeStorageKey).toBe('dentalconnect-theme');
  });
});
