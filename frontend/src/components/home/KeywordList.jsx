function KeywordChip({ keyword, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(keyword)}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        isActive
          ? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-200 shadow-[0_8px_24px_rgba(45,212,191,0.16)]'
          : 'border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:bg-white/8 hover:text-white'
      }`}
    >
      {isActive ? 'Selected . ' : ''}
      {keyword}
    </button>
  )
}

export default function KeywordList({ keywords, selectedKeywords, onKeywordClick, resultRef, onClearSelection }) {
  if (keywords.length === 0) {
    return null
  }

  return (
    <div ref={resultRef} className="animate-rise mt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-white">
            Extracted Keywords
          </h2>
          <p className="mt-2 text-sm text-white/35">
            Click any keyword to view meaning, synonyms, antonyms, and save it.
          </p>
        </div>
        <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200">
          {keywords.length} keywords found
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {keywords.map((keyword) => (
          <KeywordChip
            key={keyword}
            keyword={keyword}
            isActive={selectedKeywords.includes(keyword)}
            onClick={onKeywordClick}
          />
        ))}
      </div>

      {selectedKeywords.length > 0 ? (
        <div className="mt-8 rounded-[1.75rem] border border-cyan-300/15 bg-gradient-to-r from-cyan-400/10 via-violet-500/10 to-pink-500/10 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/35">
                Selected vocabulary
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {selectedKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onClearSelection}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:text-white"
            >
              Clear selection
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
