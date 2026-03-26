function SaveButton({ state, onClick }) {
  const isSaved = state === 'saved'
  const isSaving = state === 'saving'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSaved || isSaving}
      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
        isSaved
          ? 'cursor-not-allowed border border-emerald-300/20 bg-emerald-400/10 text-emerald-200'
          : isSaving
            ? 'cursor-wait border border-cyan-300/20 bg-cyan-400/10 text-cyan-100'
            : 'border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 hover:border-cyan-300/40 hover:bg-cyan-400/15'
      }`}
    >
      {isSaved ? 'Saved' : isSaving ? 'Saving...' : 'Save Word'}
    </button>
  )
}

function AnalysisCard({ item, saveState, onSaveWord }) {
  const isWord = item.type === 'word'

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-serif text-2xl font-bold text-white">{item.text}</h3>
          <p className="mt-1 text-sm capitalize text-cyan-200">{item.type}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isWord ? <SaveButton state={saveState} onClick={() => onSaveWord(item)} /> : null}
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Selected
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">Meaning</p>
        <p className="mt-3 text-base leading-8 text-white/80">{item.meaning}</p>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">Synonyms</p>
        {item.synonyms?.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.synonyms.map((synonym) => (
              <span
                key={`${item.text}-${synonym}`}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm text-white/75"
              >
                {synonym}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-white/35">No synonyms available.</p>
        )}
      </div>
    </article>
  )
}

export default function SelectedTextAnalysis({
  selectedResults,
  onAnalyze,
  isAnalyzing,
  canAnalyze,
  onSaveWord,
  getSaveState,
}) {
  if (!selectedResults || selectedResults.length === 0) {
    return null
  }

  return (
    <section className="animate-rise mt-10 rounded-[1.75rem] border border-cyan-300/15 bg-gradient-to-r from-cyan-400/10 via-violet-500/10 to-pink-500/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
            Selected Text Analysis
          </p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-white">Highlighted meanings</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Text'}
          </button>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70">
            {selectedResults.length} selection{selectedResults.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        {selectedResults.map((item) => (
          <AnalysisCard
            key={`${item.text}-${item.type}`}
            item={item}
            saveState={getSaveState(item)}
            onSaveWord={onSaveWord}
          />
        ))}
      </div>
    </section>
  )
}
