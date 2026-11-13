import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NetworkStatus } from './NetworkStatus';

describe('NetworkStatus', () => {
  it('warns when the connection is lost and hides when it returns', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    render(<NetworkStatus />);

    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión');

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    fireEvent(window, new Event('online'));

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});
