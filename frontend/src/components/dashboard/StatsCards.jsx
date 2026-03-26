export default function StatsCards({ stats }) {
  const cards = [
    { label: 'Total Words', value: stats.totalWords, accent: 'from-cyan-400 to-sky-500' },
    { label: 'Learned Words', value: stats.learnedWords, accent: 'from-emerald-400 to-teal-500' },
  ]

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6"
        >
          <div
            className={`h-2 w-16 rounded-full bg-gradient-to-r ${card.accent}`}
          />
          <div className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-white/35">
            {card.label}
          </div>
          <div className="mt-4 font-serif text-5xl font-bold text-white">{card.value}</div>
        </article>
      ))}
    </div>
  )
}
