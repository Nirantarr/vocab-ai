const stats = [
  { value: '2.4M+', label: 'Words analyzed' },
  { value: '180K+', label: 'Active learners' },
  { value: '98%', label: 'Accuracy rate' },
  { value: '40+', label: 'Languages' },
]

export default function StatsBar() {
  return (
    <section className="border-y border-white/8 bg-white/[0.02]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-white/8 px-0 sm:grid-cols-4 sm:divide-y-0">
        {stats.map((item) => (
          <div key={item.label} className="px-8 py-9 text-center">
            <div className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text font-serif text-4xl font-bold text-transparent">
              {item.value}
            </div>
            <div className="mt-3 text-sm font-medium text-white/35">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
