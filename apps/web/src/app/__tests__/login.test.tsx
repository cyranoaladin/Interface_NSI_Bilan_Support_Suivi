import { ToastProvider } from '@/components/ui/Toast';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HomePage from '../page';

describe('Login page', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({}) }));
  });

  it('shows errors on invalid submit', async () => {
    render(<ToastProvider><HomePage /></ToastProvider>);
    fireEvent.click(screen.getByText('Se connecter'));
    await waitFor(() => {
      expect(screen.getAllByText('Identifiants invalides').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('calls API with proper payload', async () => {
    // Rester en erreur pour éviter les navigations non supportées par jsdom
    // @ts-ignore
    global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({}) }));
    render(<ToastProvider><HomePage /></ToastProvider>);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@ert.tn' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Se connecter'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const [url, init] = (global.fetch as any).mock.calls[0];
      expect(url).toBe('/api/auth/login');
      expect(JSON.parse(init.body)).toEqual({ email: 'test@ert.tn', password: 'password123' });
    });
  });
});
