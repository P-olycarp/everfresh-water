import { useState } from 'react';
import { api } from './api';

export default function Login({ onLogin }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();

    if (!pin.trim()) {
      setError('Please enter your PIN');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await api.login(pin);

      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));

      onLogin(result.user);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gate">
      <div className="gate-wordmark">
        EVER<span>FRESH</span> WATER
      </div>

      <div className="gate-tagline">
        Sales & Reconciliation System
      </div>

      <form
        className="gate-pin-form"
        onSubmit={handleSubmit}
      >

        <input
          type="password"
          placeholder="Enter PIN"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />

        {error && (
          <div className="gate-error">
            {error}
          </div>
        )}

        <button
          className="gate-btn"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>

      </form>

      <div className="gate-hint">
        Sign in using your assigned PIN.
      </div>
    </div>
  );
}