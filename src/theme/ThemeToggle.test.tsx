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

const openMenu = () =>
  fireEvent.click(screen.getByRole('button', { name: /Tema de la interfaz/i }));

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
  it('switches to dark, persists the preference and closes the menu', async () => {
    renderToggle();
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Oscuro' }));

    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
    expect(window.localStorage.getItem(themeStorageKey)).toBe('dark');
    expect(screen.queryByRole('button', { name: 'Oscuro' })).not.toBeInTheDocument();
  });

  it('switches back to light', async () => {
    renderToggle();
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Oscuro' }));
    openMenu();
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
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Sistema' }));

    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
    expect(window.localStorage.getItem(themeStorageKey)).toBe('system');
  });

  it('closes with Escape and returns focus to the trigger', () => {
    renderToggle();
    const trigger = screen.getByRole('button', { name: /Tema de la interfaz/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('button', { name: 'Oscuro' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when clicking outside', () => {
    renderToggle();
    openMenu();
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('button', { name: 'Oscuro' })).not.toBeInTheDocument();
  });
});
