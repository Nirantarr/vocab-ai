function DetailList({ title, items }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">{title}</p>
      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={`${title}-${item}`}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm text-white/75"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-white/35">No {title.toLowerCase()} available.</p>
      )}
    </div>
  )
}

export default function WordModal({
  wordDetail,
  isLoading,
  error,
  onClose,
  onSave,
  isSaving,
  saveMessage,
}) {
  if (!wordDetail && !isLoading && !error) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d1020]/95 shadow-[0_40px_90px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              Vocabulary Insight
            </p>
            <h3 className="mt-2 font-serif text-3xl font-bold text-white">
              {wordDetail?.word || 'Loading word...'}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/65 transition hover:border-white/20 hover:text-white"
            aria-label="Close word detail"
          >
            x
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 text-sm text-white/60">
              Fetching word details...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {wordDetail ? (
            <>
              <div className="rounded-[1.5rem] border border-cyan-300/15 bg-gradient-to-r from-cyan-400/10 via-violet-500/10 to-pink-500/10 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                  Meaning
                </p>
                <p className="mt-3 text-base leading-8 text-white/80">{wordDetail.meaning}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailList title="Synonyms" items={wordDetail.synonyms || []} />
                <DetailList title="Antonyms" items={wordDetail.antonyms || []} />
              </div>
            </>
          ) : null}

          {saveMessage ? (
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-5 py-4 text-sm text-cyan-100">
              {saveMessage}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/8 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:text-white"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!wordDetail || isSaving || isLoading}
            className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(45,212,191,0.2)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
          >
            {isSaving ? 'Saving...' : 'Save Word'}
          </button>
        </div>
      </div>
    </div>
  )
}
