function ResultRow({ item, index }) {
  const isCorrect = item.selectedAnswer === item.correctAnswer

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
            Question {index + 1}
          </div>
          <div className="mt-3 text-lg font-semibold text-white">{item.prompt}</div>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            isCorrect
              ? 'bg-emerald-400/10 text-emerald-200'
              : 'bg-red-400/10 text-red-200'
          }`}
        >
          {isCorrect ? 'Correct' : 'Incorrect'}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm lg:grid-cols-2">
        <div>
          <div className="text-white/35">Your answer</div>
          <div className="mt-1 text-white/80">{item.selectedAnswer || 'No answer selected'}</div>
        </div>
        <div>
          <div className="text-white/35">Correct answer</div>
          <div className="mt-1 text-white/80">{item.correctAnswer}</div>
        </div>
      </div>
    </div>
  )
}

export default function TestResults({ results, score, percentage, onRestart }) {
  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
          Test result
        </p>
        <h1 className="mt-4 font-serif text-5xl font-bold text-white">Quiz complete</h1>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-white/35">Score</div>
            <div className="mt-3 text-4xl font-bold text-white">{score}/{results.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-white/35">Percentage</div>
            <div className="mt-3 text-4xl font-bold text-white">{percentage}%</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-white/35">Reviewed</div>
            <div className="mt-3 text-4xl font-bold text-white">{results.length}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRestart}
          className="mt-8 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]"
        >
          Start another test
        </button>
      </div>

      <div className="space-y-4">
        {results.map((item, index) => (
          <ResultRow key={item.id} item={item} index={index} />
        ))}
      </div>
    </section>
  )
}
