import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth, useAuthStore } from '../providers/auth-provider';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function TestConsumer() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user?.email ?? 'none'}</span>
      <button onClick={() => void login('test@example.com', 'password')}>
        Login
      </button>
      <button onClick={() => void logout()}>Logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    mockFetch.mockReset();
    // Default: silent refresh fails on mount
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in loading state and resolves to unauthenticated', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('login sets token and user', async () => {
    const user = userEvent.setup();

    // First call: mount refresh attempt (fails)
    // Second call: login request (succeeds)
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          accessToken: 'jwt-token-123',
          user: {
            userId: 'u1',
            tenantId: 't1',
            roles: ['admin'],
            email: 'test@example.com',
            name: 'Test User',
          },
        }),
      });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });
    expect(screen.getByTestId('user').textContent).toBe('test@example.com');
  });

  it('logout clears auth state', async () => {
    const user = userEvent.setup();

    // Mount: refresh fails. Login: succeeds. Logout: succeeds.
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          accessToken: 'jwt-token-123',
          user: {
            userId: 'u1',
            tenantId: 't1',
            roles: ['admin'],
            email: 'test@example.com',
            name: 'Test User',
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Login
    await user.click(screen.getByText('Login'));
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    // Logout
    await user.click(screen.getByText('Logout'));
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('silent refresh on mount sets authenticated if successful', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: 'refreshed-token',
        user: {
          userId: 'u1',
          tenantId: 't1',
          roles: ['admin'],
          email: 'refreshed@example.com',
          name: 'Refreshed User',
        },
      }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });
    expect(screen.getByTestId('user').textContent).toBe('refreshed@example.com');
  });
});
