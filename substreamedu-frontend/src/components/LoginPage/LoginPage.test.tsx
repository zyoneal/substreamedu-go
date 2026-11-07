import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../store/AuthContext';
import { AuthService } from '../../services/AuthService';

jest.mock('lucide-react/dist/esm/icons/x', () => () => <span data-testid="icon-x" />);
jest.mock('lucide-react/dist/esm/icons/edit-2', () => () => <span data-testid="icon-edit" />);
jest.mock('lucide-react/dist/esm/icons/alert-circle', () => () => <span data-testid="icon-alert" />);
jest.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <div role="button" data-testid="google-login-sdk" />,
}));

import LoginPage from './LoginPage';

describe('LoginPage (Pixzen Editorial)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
    jest.restoreAllMocks();
  });

  const renderLoginPage = () =>
    render(
      <IntlProvider locale="en" messages={{}}>
        <AuthContext.Provider
          value={{
            isLoggedIn: false,
            setIsLoggedIn: jest.fn(),
            authorities: [],
            setAuthorities: jest.fn(),
          }}
        >
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </IntlProvider>,
    );

  it('activates the Pixzen theme on body and renders grain overlay, email form, and Google CTA', () => {
    const { container, unmount } = renderLoginPage();

    expect(document.body.classList.contains('pixzen')).toBe(true);
    expect(container.querySelector('.pixzenGrain')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get code/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();

    unmount();
    expect(document.body.classList.contains('pixzen')).toBe(false);
  });

  it('validates email format and transitions to OTP verification on submit', async () => {
    jest.spyOn(AuthService, 'login').mockResolvedValue('ok');
    renderLoginPage();

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    expect(screen.getByText(/email must contain @/i)).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: 'learner@substreamedu.com' } });
    const submitBtn = screen.getByRole('button', { name: /get code/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(AuthService.login).toHaveBeenCalledWith('learner@substreamedu.com');
      expect(screen.getByLabelText(/confirmation code/i)).toBeInTheDocument();
    });
  });
});
