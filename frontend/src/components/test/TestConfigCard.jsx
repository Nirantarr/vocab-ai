const QUIZ_LIMITS = [5, 10, 15, 20]

export default function TestConfigCard({
  selectedLimit,
  onSelectLimit,
  onStart,
  loading,
  error,
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
        Test setup
      </p>
      <h1 className="mt-4 font-serif text-5xl font-bold text-white">Challenge your learned words</h1>
      <p className="mt-4 max-w-2xl text-lg text-white/45">
        Start a randomized multiple-choice quiz built from the words you have already marked as learned.
      </p>

      <div className="mt-8">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/35">
          Number of questions
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {QUIZ_LIMITS.map((limit) => (
            <button
              key={limit}
              type="button"
              onClick={() => onSelectLimit(limit)}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                selectedLimit === limit
                  ? 'bg-gradient-to-r from-cyan-400 to-violet-500 text-white shadow-[0_10px_28px_rgba(56,189,248,0.24)]'
                  : 'border border-white/10 bg-slate-950/30 text-white/75 hover:border-cyan-300/30 hover:text-white'
              }`}
            >
              {limit} questions
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-8">
        <button
          type="button"
          onClick={onStart}
          disabled={loading}
          className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(56,189,248,0.24)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Preparing test...' : 'Start test'}
        </button>
      </div>
    </section>
  )
}
