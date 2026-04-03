import { useEffect, useState } from "react";
import {
  login,
  register,
  requestPasswordReset,
  resetPassword,
  type AuthSession,
} from "../api";

const modes = ["login", "register", "request", "reset"] as const;

type Mode = (typeof modes)[number];

type AuthPanelProps = {
  onSession: (session: AuthSession) => void;
};

const initialMode: Mode = "login";

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
};

export default function AuthPanel({ onSession }: AuthPanelProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const linkEmail = params.get("email") ?? "";
    const linkToken = params.get("token") ?? "";
    if (linkEmail || linkToken) {
      setEmail(linkEmail);
      setToken(linkToken);
      setMode("reset");
    }
  }, []);

  const handleLogin = async () => {
    setError(null);
    setStatus(null);
    setIsWorking(true);
    try {
      const session = await login(email, password);
      onSession(session);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsWorking(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    setStatus(null);
    setIsWorking(true);
    try {
      const session = await register(email, password);
      onSession(session);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsWorking(false);
    }
  };

  const handleRequestReset = async () => {
    setError(null);
    setStatus(null);
    setIsWorking(true);
    try {
      const response = await requestPasswordReset(email);
      if (response.devToken) {
        setStatus(`Dev token: ${response.devToken}`);
      } else {
        setStatus("If your email exists, a reset link was sent.");
      }
      setMode("reset");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsWorking(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setStatus(null);
    setIsWorking(true);
    try {
      await resetPassword(email, token, password);
      setStatus("Password updated. You can sign in now.");
      setMode("login");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-kicker">Task Manager</p>
          <h1 className="auth-title">
            {mode === "login" && "Welcome back"}
            {mode === "register" && "Create your account"}
            {mode === "request" && "Reset your password"}
            {mode === "reset" && "Choose a new password"}
          </h1>
          <p className="auth-subtitle">
            {mode === "login" && "Sign in to keep your projects in sync."}
            {mode === "register" && "Start fresh with your own workspace."}
            {mode === "request" && "We will email you a reset link."}
            {mode === "reset" && "Paste the token you received to continue."}
          </p>
        </div>

        <div className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          {mode !== "request" && (
            <label className="auth-field">
              <span>{mode === "reset" ? "New password" : "Password"}</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete={
                  mode === "reset" ? "new-password" : "current-password"
                }
              />
            </label>
          )}

          {mode === "reset" && (
            <label className="auth-field">
              <span>Reset token</span>
              <input
                type="text"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste token"
                autoComplete="one-time-code"
              />
            </label>
          )}

          {error && <div className="auth-alert auth-alert--error">{error}</div>}
          {status && (
            <div className="auth-alert auth-alert--info">{status}</div>
          )}

          <div className="auth-actions">
            {mode === "login" && (
              <button type="button" onClick={handleLogin} disabled={isWorking}>
                Sign in
              </button>
            )}
            {mode === "register" && (
              <button
                type="button"
                onClick={handleRegister}
                disabled={isWorking}
              >
                Create account
              </button>
            )}
            {mode === "request" && (
              <button
                type="button"
                onClick={handleRequestReset}
                disabled={isWorking}
              >
                Send reset link
              </button>
            )}
            {mode === "reset" && (
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isWorking}
              >
                Update password
              </button>
            )}
          </div>
        </div>

        <div className="auth-footer">
          {mode === "login" && (
            <>
              <button
                type="button"
                onClick={() => setMode("register")}
                className="auth-link"
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => setMode("request")}
                className="auth-link"
              >
                Forgot password
              </button>
            </>
          )}
          {mode === "register" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="auth-link"
            >
              Back to sign in
            </button>
          )}
          {(mode === "request" || mode === "reset") && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="auth-link"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
