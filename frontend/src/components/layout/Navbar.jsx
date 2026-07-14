import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Logo from './Logo'
import { initTheme } from '../../services/theme'

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Analyzer', href: '/#analyzer' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Test', href: '/test' },
]

function ThemeToggleButton({ className = '', compact = false }) {
  return (
    <button
      type="button"
      data-theme-toggle
      className={className}
      style={{
        borderColor: "var(--border-subtle)",
        color: "var(--text-primary)",
        backgroundColor: "var(--surface-muted)",
      }}
    >
      <span data-theme-icon className="text-base leading-none">{compact ? '☾' : '☾'}</span>
      {!compact ? <span data-theme-label className="sr-only">Theme</span> : null}
    </button>
  )
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()

  useEffect(() => initTheme(), [isOpen])

  const closeMenu = () => setIsOpen(false)

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        backgroundColor: "var(--surface-elevated)",
        color: "var(--text-primary)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <Link to="/" onClick={closeMenu} className="min-w-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium lg:flex" style={{ color: "var(--text-soft)" }}>
          {navLinks.map((link) =>
            link.href.startsWith('/#') ? (
              <a key={link.label} href={link.href} className="transition hover:opacity-100" style={{ color: "inherit" }}>
                {link.label}
              </a>
            ) : (
              <NavLink key={link.label} to={link.href} className="transition hover:opacity-100" style={{ color: "inherit" }}>
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggleButton className="rounded-xl border px-3 py-2 text-sm font-semibold transition" />
          {isAuthenticated ? (
            <>
              <div
                className="max-w-[18rem] truncate rounded-xl px-4 py-2 text-sm font-medium"
                style={{
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--surface-muted)",
                  color: "var(--text-primary)",
                }}
              >
                {user.email}
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition hover:opacity-100"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--button-muted-text)",
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition hover:opacity-100"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--button-muted-text)",
                }}
              >
                Log in
              </Link>
              <Link
                to="/login?mode=signup"
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(45,212,191,0.28)] transition hover:scale-[1.02]"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggleButton
            compact
            className="rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm"
          />
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="rounded-xl border p-2"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            aria-label="Toggle navigation"
            aria-expanded={isOpen}
          >
            <span className="block h-0.5 w-5 bg-current" />
            <span className="mt-1.5 block h-0.5 w-5 bg-current" />
            <span className="mt-1.5 block h-0.5 w-5 bg-current" />
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          className="px-4 py-4 sm:px-6 lg:hidden"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            backgroundColor: "var(--surface-elevated)",
            color: "var(--text-primary)",
          }}
        >
          <div className="flex flex-col gap-4">
            {navLinks.map((link) =>
              link.href.startsWith('/#') ? (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={closeMenu}
                  className="text-sm font-medium transition hover:opacity-100"
                  style={{ color: "var(--text-muted)" }}
                >
                  {link.label}
                </a>
              ) : (
                <NavLink
                  key={link.label}
                  to={link.href}
                  onClick={closeMenu}
                  className="text-sm font-medium transition hover:opacity-100"
                  style={{ color: "var(--text-muted)" }}
                >
                  {link.label}
                </NavLink>
              )
            )}

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {isAuthenticated ? (
                <>
                  <div
                    className="rounded-xl px-4 py-2.5 text-center text-sm font-medium break-all sm:col-span-2"
                    style={{
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--surface-muted)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {user.email}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      closeMenu()
                    }}
                    className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                    style={{
                      borderColor: "var(--border-subtle)",
                      color: "var(--button-muted-text)",
                    }}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="rounded-xl border px-4 py-2.5 text-center text-sm font-semibold"
                    style={{
                      borderColor: "var(--border-subtle)",
                      color: "var(--button-muted-text)",
                    }}
                  >
                    Log in
                  </Link>
                  <Link
                    to="/login?mode=signup"
                    onClick={closeMenu}
                    className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}
