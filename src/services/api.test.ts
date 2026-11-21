import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiBaseUrl } from './api';

describe('apiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the configured API URL and removes trailing slashes', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/api///');

    expect(apiBaseUrl()).toBe('https://api.example.com/api');
  });

  it('fails explicitly when the API URL is not configured', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');

    expect(() => apiBaseUrl()).toThrow('La URL de la API no está configurada para este ambiente.');
  });
});
