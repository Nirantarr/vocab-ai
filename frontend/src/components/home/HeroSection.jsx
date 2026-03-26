import { Link } from 'react-router-dom'

export default function HeroSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-14 pt-16 text-center lg:px-10 lg:pb-18 lg:pt-24">
      <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
        <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.85)]" />
        AI-Powered . Instant Results
      </div>

      <h1 className="mx-auto mt-8 max-w-5xl font-serif text-5xl font-bold leading-none tracking-tight text-white sm:text-6xl lg:text-8xl">
        Turn your reading
        <span className="mt-2 block bg-gradient-to-r from-fuchsia-400 via-pink-500 to-orange-400 bg-clip-text text-transparent">
          into learning.
        </span>
      </h1>

      <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-white/45 sm:text-xl">
        Paste any passage, article, essay, or book excerpt and let VocabAI pull out the
        vocabulary that matters most for your growth.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/login?mode=signup"
          className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-8 py-4 text-base font-semibold text-white shadow-[0_16px_40px_rgba(59,130,246,0.28)] transition hover:scale-[1.02]"
        >
          Start for free
        </Link>
        <a
          href="#how-it-works"
          className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          Watch demo
        </a>
      </div>

      <p className="mt-8 text-sm text-white/25">
        No credit card required . Free tier available . Cancel anytime
      </p>
    </section>
  )
}
