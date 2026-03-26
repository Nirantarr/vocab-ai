const steps = [
  {
    step: '01',
    title: 'Paste your text',
    description: 'Drop in any paragraph, article, essay, or book excerpt.',
  },
  {
    step: '02',
    title: 'Analyze instantly',
    description: 'VocabAI sends the text to your backend and extracts useful keywords.',
  },
  {
    step: '03',
    title: 'Review keywords',
    description: 'Returned keywords show up as clickable buttons for fast exploration.',
  },
  {
    step: '04',
    title: 'Keep learning',
    description: 'Use the extracted words as the starting point for deeper vocabulary practice.',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16 lg:px-10">
      <h2 className="text-center font-serif text-4xl font-bold tracking-tight text-white sm:text-6xl">
        How it works
      </h2>

      <div className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-4 xl:gap-0">
        {steps.map((step, index) => (
          <div
            key={step.step}
            className={`px-8 py-6 text-center ${
              index < steps.length - 1 ? 'xl:border-r xl:border-white/8' : ''
            }`}
          >
            <div className="text-sm font-bold tracking-[0.24em] text-cyan-300">{step.step}</div>
            <h3 className="mt-6 text-2xl font-semibold text-white">{step.title}</h3>
            <p className="mt-4 text-base leading-8 text-white/38">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
