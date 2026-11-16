import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@company.com' },
  { role: 'Manager', email: 'manager@company.com' },
  { role: 'Employee', email: 'employee@company.com' }
];
const DEMO_PASSWORD = 'Password123!';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(`/${user.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError('');
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>WorkTrack</h1>
        <p className="subtitle">Employee Attendance &amp; Work Monitoring System</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-field" style={{ marginBottom: 14 }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="form-field" style={{ marginBottom: 18 }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-accounts">
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Demo accounts (click to autofill)</div>
          {DEMO_ACCOUNTS.map((acc) => (
            <div key={acc.email} className="demo-row" onClick={() => fillDemo(acc.email)}>
              <span>{acc.role}</span>
              <span>{acc.email}</span>
            </div>
          ))}
          <div style={{ marginTop: 6 }}>Password: <code>{DEMO_PASSWORD}</code></div>
        </div>
      </div>
    </div>
  );
}
