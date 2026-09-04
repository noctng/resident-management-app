import React, { useState } from 'react';
import { User } from '../types';
import {
  KeyIcon,
  UserIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
} from '../components/icons';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại.');
      }

      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-sans">
      {/* ── Brand Panel (desktop) ── */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden bg-gradient-to-br from-sidebar-bg to-sidebar-bg-2 p-12"
      >
        <svg
          className="absolute -bottom-40 -right-40 w-[480px] h-[480px] opacity-[0.08]"
          viewBox="0 0 200 200"
          fill="none"
          stroke="#F2F3EF"
          strokeWidth="0.6"
        >
          <circle cx="100" cy="100" r="98" />
          <circle cx="100" cy="100" r="78" />
          <circle cx="100" cy="100" r="58" />
          <circle cx="100" cy="100" r="38" />
        </svg>

        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-white/50">
            Thành Phố Cà Phê
          </p>
          <span className="mt-3 inline-block px-2.5 py-1 rounded-md border border-white/20 text-[10px] font-bold tracking-[0.25em] uppercase text-white/70">
            Quản trị
          </span>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-serif text-4xl xl:text-5xl font-medium text-bg leading-tight">
            Hệ thống
            <br />
            quản trị toà nhà
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-white/60">
            Khu vực dành cho nhân viên Ban Quản Lý — vận hành cư dân, tài chính, tiện ích và kinh
            doanh bất động sản.
          </p>
        </div>

        <div className="relative">
          <p className="text-xs text-white/40">
            Resident Management System · {new Date().getFullYear()}
          </p>
        </div>
      </aside>

      {/* ── Form Side ── */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        <a
          href="/"
          className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-accent transition-colors"
          aria-label="Sang Cổng thông tin cư dân"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Cổng cư dân</span>
        </a>

        <div className="w-full max-w-sm">
          {/* Brand thu gọn cho mobile */}
          <div className="lg:hidden mb-8 text-center">
            <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink-faint">
              Thành Phố Cà Phê · Quản trị
            </p>
            <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">Đăng nhập quản trị</h1>
          </div>

          <h1 className="hidden lg:block font-serif text-3xl font-semibold text-ink">
            Đăng nhập quản trị
          </h1>
          <p className="hidden lg:block mt-2 text-sm text-ink-soft">
            Dành cho nhân viên Ban Quản Lý.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-ink-soft mb-1">
                Tên đăng nhập
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-faint">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 rounded-[10px] border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                  placeholder="Nhập tên đăng nhập"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password-input"
                className="block text-xs font-semibold text-ink-soft mb-1"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-faint">
                  <KeyIcon className="w-4 h-4" />
                </span>
                <input
                  id="password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-11 py-2.5 rounded-[10px] border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-faint hover:text-ink transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 bg-brand-danger-soft border border-brand-danger/20 rounded-lg motion-safe:animate-shake"
              >
                <p className="text-sm text-brand-danger font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-wait cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 motion-safe:[&>svg:last-child]:transition-transform motion-safe:hover:[&>svg:last-child]:translate-x-0.5"
            >
              {isLoading ? (
                <>
                  <span className="inline-flex items-center justify-center rounded-full h-4 w-4 border-2 border-white/80"></span>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 pt-5 border-t border-brand-border text-xs text-center text-ink-faint">
            © {new Date().getFullYear()} Ban Quản Lý Thành Phố Cà Phê
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
