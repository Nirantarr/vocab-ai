function TermList({ items, emptyLabel }) {
  if (!items || items.length === 0) {
    return <span className="text-white/30">{emptyLabel}</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/75"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function SectionDivider() {
  return <div className="my-8 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
}

export default function WordList({
  totalWords,
  sections,
  searchQuery,
  onSearchChange,
  updatingWord,
  onToggleLearned,
}) {
  if (totalWords === 0) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8 text-white/45">
        No saved words yet. Analyze some text and save a few keywords to build your vocabulary dashboard.
      </div>
    )
  }

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-col gap-5 border-b border-white/8 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
            Saved words
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Browse your vocabulary library</h2>
          <p className="mt-2 text-sm text-white/45">
            Search across meanings, synonyms, and antonyms while keeping words grouped alphabetically.
          </p>
        </div>
        <div className="w-full max-w-md">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
            Search words
          </label>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by word, meaning, synonym, or antonym"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40 focus:bg-slate-950/60"
          />
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="py-12 text-center text-white/45">
          No words match your current search.
        </div>
      ) : (
        <div className="pt-6">
          {sections.map((section, sectionIndex) => (
            <div key={section.letter}>
              {sectionIndex > 0 ? <SectionDivider /> : null}
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 font-serif text-xl font-bold text-cyan-100">
                  {section.letter}
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/35">
                    {section.letter === '#' ? 'Other' : `${section.letter} words`}
                  </div>
                  <div className="text-sm text-white/45">{section.items.length} saved entries</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-white/8 bg-slate-950/20">
                <div className="grid grid-cols-[1fr_1.7fr_1.1fr_1.1fr_0.9fr] gap-4 border-b border-white/8 px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                  <span>Word</span>
                  <span>Meaning</span>
                  <span>Synonyms</span>
                  <span>Antonyms</span>
                  <span>Learned</span>
                </div>
                <div className="divide-y divide-white/8">
                  {section.items.map((word) => (
                    <div
                      key={word.id}
                      className="grid grid-cols-[1fr_1.7fr_1.1fr_1.1fr_0.9fr] gap-4 px-6 py-5 text-sm text-white/80"
                    >
                      <span className="font-semibold text-cyan-100">{word.word || 'Unknown'}</span>
                      <span className="text-white/55">{word.meaning || 'No meaning available.'}</span>
                      <TermList items={word.synonyms} emptyLabel="No synonyms" />
                      <TermList items={word.antonyms} emptyLabel="No antonyms" />
                      <label className="inline-flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={Boolean(word.isLearned)}
                          disabled={updatingWord === word.word}
                          onChange={(event) => onToggleLearned(word.word, event.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-transparent text-cyan-400 focus:ring-cyan-400"
                        />
                        <span className="font-semibold text-white/75">
                          {updatingWord === word.word ? 'Updating...' : word.isLearned ? 'Learned' : 'Pending'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
