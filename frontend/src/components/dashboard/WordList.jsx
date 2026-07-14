function TermList({ items, emptyLabel }) {
  if (!items || items.length === 0) {
    return <span className="break-words text-white/30">{emptyLabel}</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="max-w-full break-words rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/75"
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

function MobileField({ label, children }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className="break-words text-sm text-white/75">{children}</div>
    </div>
  )
}

function LearnedToggle({ word, updatingWord, onToggleLearned }) {
  return (
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
  )
}

function MobileWordCard({ word, updatingWord, onToggleLearned }) {
  return (
    <article className="rounded-[1.25rem] border border-white/8 bg-slate-950/20 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.18)]">
      <div className="space-y-4">
        <MobileField label="Word">
          <span className="font-semibold text-cyan-100">{word.word || 'Unknown'}</span>
        </MobileField>
        <MobileField label="Meaning">
          <span className="break-words text-white/55">{word.meaning || 'No meaning available.'}</span>
        </MobileField>
        <MobileField label="Synonyms">
          <TermList items={word.synonyms} emptyLabel="No synonyms" />
        </MobileField>
        <MobileField label="Antonyms">
          <TermList items={word.antonyms} emptyLabel="No antonyms" />
        </MobileField>
        <MobileField label="Learned">
          <LearnedToggle
            word={word}
            updatingWord={updatingWord}
            onToggleLearned={onToggleLearned}
          />
        </MobileField>
      </div>
    </article>
  )
}

function DesktopTable({ section, updatingWord, onToggleLearned }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <div className="min-w-[860px] overflow-hidden rounded-[1.5rem] border border-white/8 bg-slate-950/20 lg:min-w-0">
        <div className="grid grid-cols-[minmax(10rem,1fr)_minmax(18rem,1.7fr)_minmax(12rem,1.1fr)_minmax(12rem,1.1fr)_minmax(9rem,0.9fr)] gap-4 border-b border-white/8 px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
          <span className="lg:sticky lg:left-0 lg:z-10 lg:-mx-6 lg:bg-slate-950/95 lg:px-6 lg:py-0">Word</span>
          <span>Meaning</span>
          <span>Synonyms</span>
          <span>Antonyms</span>
          <span>Learned</span>
        </div>
        <div className="divide-y divide-white/8">
          {section.items.map((word) => (
            <div
              key={word.id}
              className="grid grid-cols-[minmax(10rem,1fr)_minmax(18rem,1.7fr)_minmax(12rem,1.1fr)_minmax(12rem,1.1fr)_minmax(9rem,0.9fr)] gap-4 px-6 py-5 text-sm text-white/80"
            >
              <span className="break-words font-semibold text-cyan-100 lg:sticky lg:left-0 lg:z-10 lg:-mx-6 lg:bg-slate-950/95 lg:px-6">
                {word.word || 'Unknown'}
              </span>
              <span className="break-words text-white/55">{word.meaning || 'No meaning available.'}</span>
              <TermList items={word.synonyms} emptyLabel="No synonyms" />
              <TermList items={word.antonyms} emptyLabel="No antonyms" />
              <LearnedToggle
                word={word}
                updatingWord={updatingWord}
                onToggleLearned={onToggleLearned}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
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
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 sm:p-6">
      <div className="flex flex-col gap-5 border-b border-white/8 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
            Saved words
          </p>
          <h2 className="mt-3 break-words text-xl font-semibold text-white sm:text-2xl">
            Browse your vocabulary library
          </h2>
          <p className="mt-2 max-w-2xl break-words text-sm text-white/45">
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
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 font-serif text-xl font-bold text-cyan-100">
                  {section.letter}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/35">
                    {section.letter === '#' ? 'Other' : `${section.letter} words`}
                  </div>
                  <div className="text-sm text-white/45">{section.items.length} saved entries</div>
                </div>
              </div>

              <div className="grid gap-4 md:hidden">
                {section.items.map((word) => (
                  <MobileWordCard
                    key={word.id}
                    word={word}
                    updatingWord={updatingWord}
                    onToggleLearned={onToggleLearned}
                  />
                ))}
              </div>

              <DesktopTable
                section={section}
                updatingWord={updatingWord}
                onToggleLearned={onToggleLearned}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
