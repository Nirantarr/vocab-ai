const features = [
  {
    title: 'Instant Extraction',
    description:
      'Pull high-value vocabulary from articles, essays, and study material in a single click.',
    accent: 'from-teal-400/20 to-transparent',
  },
  {
    title: 'Smart Ranking',
    description:
      'Surface the words that matter most by filtering noise and highlighting repeated terms.',
    accent: 'from-violet-400/20 to-transparent',
  },
  {
    title: 'Clickable Keywords',
    description:
      'Review returned keywords as interactive chips so users can quickly focus on specific terms.',
    accent: 'from-pink-400/20 to-transparent',
  },
  {
    title: 'Built For Learning',
    description:
      'Pair text analysis with saved words, revision tracking, and future flashcard workflows.',
    accent: 'from-amber-400/20 to-transparent',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Everything you need to
          <span className="mt-2 block bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            master vocabulary
          </span>
        </h2>
        <p className="mt-5 text-lg text-white/35">
          Built for VocabAI learners who want a cleaner path from reading to retention.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-8 transition hover:-translate-y-1 hover:border-white/15"
          >
            <div
              className={`mb-6 h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.accent} from-20% to-80% ring-1 ring-white/10`}
            />
            <h3 className="text-2xl font-semibold text-white">{feature.title}</h3>
            <p className="mt-4 text-base leading-8 text-white/38">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
