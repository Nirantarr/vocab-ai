function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-white/28">{title}</h3>
      <div className="mt-6 space-y-4">
        {links.map((link) => (
          <a key={link} href="#" className="block text-lg text-white/45 transition hover:text-white">
            {link}
          </a>
        ))}
      </div>
    </div>
  )
}

export default function Footer() {
  return (
    <footer
      id="resources"
      className="mt-16 border-t border-white/8 bg-gradient-to-b from-white/[0.02] to-transparent"
    >
      <div className="mx-auto grid max-w-7xl gap-14 px-6 py-14 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-10">
        <div>
          <div className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text font-serif text-4xl font-bold text-transparent">
            VocabAI
          </div>
          <p className="mt-5 max-w-xs text-base leading-8 text-white/35">
            AI-powered vocabulary extraction for readers who want to study smarter.
          </p>
        </div>

        <FooterColumn title="Product" links={['Features', 'Pricing', 'Changelog', 'Roadmap']} />
        <FooterColumn title="Resources" links={['Docs', 'Blog', 'API', 'Status']} />
        <FooterColumn title="Company" links={['About', 'Careers', 'Press', 'Contact']} />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/8 px-6 py-6 text-sm text-white/25 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <p>© 2026 VocabAI . All rights reserved</p>
        <div className="flex gap-6">
          {['Privacy', 'Terms', 'Cookies'].map((label) => (
            <a key={label} href="#" className="transition hover:text-white/55">
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
