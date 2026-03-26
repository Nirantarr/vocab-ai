import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Logo from './Logo'

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Analyzer', href: '/#analyzer' },
  { label: 'Dashboard', href: '/dashboard' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()

  const closeMenu = () => setIsOpen(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link to="/" onClick={closeMenu}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-white/55 lg:flex">
          {navLinks.map((link) =>
            link.href.startsWith('/#') ? (
              <a key={link.label} href={link.href} className="transition hover:text-white">
                {link.label}
              </a>
            ) : (
              <NavLink key={link.label} to={link.href} className="transition hover:text-white">
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <>
              <div className="rounded-xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100">
                {user.email}
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-cyan-400/40 hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-cyan-400/40 hover:text-white"
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

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="rounded-xl border border-white/10 p-2 text-white lg:hidden"
          aria-label="Toggle navigation"
        >
          <span className="block h-0.5 w-5 bg-current" />
          <span className="mt-1.5 block h-0.5 w-5 bg-current" />
          <span className="mt-1.5 block h-0.5 w-5 bg-current" />
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-white/8 bg-slate-950/95 px-6 py-4 lg:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) =>
              link.href.startsWith('/#') ? (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={closeMenu}
                  className="text-sm font-medium text-white/70 transition hover:text-white"
                >
                  {link.label}
                </a>
              ) : (
                <NavLink
                  key={link.label}
                  to={link.href}
                  onClick={closeMenu}
                  className="text-sm font-medium text-white/70 transition hover:text-white"
                >
                  {link.label}
                </NavLink>
              )
            )}

            <div className="mt-2 flex gap-3">
              {isAuthenticated ? (
                <>
                  <div className="flex-1 rounded-xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-2.5 text-center text-sm font-medium text-cyan-100">
                    {user.email}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      closeMenu()
                    }}
                    className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white/80"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/login?mode=signup"
                    onClick={closeMenu}
                    className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2.5 text-center text-sm font-semibold text-white"
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
