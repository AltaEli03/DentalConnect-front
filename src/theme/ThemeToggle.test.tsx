import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';
import { themeStorageKey } from '../lib/theme';

const renderToggle = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
  );
});

describe('ThemeToggle', () => {
  it('switches to dark and persists the preference', async () => {
    renderToggle();
    fireEvent.click(screen.getByRole('button', { name: 'Oscuro' }));

    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
    expect(window.localStorage.getItem(themeStorageKey)).toBe('dark');
    expect(screen.getByRole('button', { name: 'Oscuro' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches back to light', async () => {
    renderToggle();
    fireEvent.click(screen.getByRole('button', { name: 'Oscuro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Claro' }));

    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(false));
    expect(window.localStorage.getItem(themeStorageKey)).toBe('light');
  });

  it('follows the system preference', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: true,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
    );
    renderToggle();
    fireEvent.click(screen.getByRole('button', { name: 'Sistema' }));

    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
    expect(screen.getByRole('button', { name: 'Sistema' })).toHaveAttribute('aria-pressed', 'true');
  });
});
