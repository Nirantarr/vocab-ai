function FooterColumn({ title, links }) {
  return (
    <div className="text-center md:text-left">
      <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-white/28">{title}</h3>
      <div className="mt-5 space-y-3 md:mt-6">
        {links.map((link) => (
          <a
            key={link}
            href="#"
            className="block break-words text-base text-white/45 transition hover:text-white sm:text-lg"
          >
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
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 text-center sm:px-6 md:grid-cols-2 md:gap-12 md:text-left lg:px-10 xl:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="md:col-span-2 xl:col-span-1">
          <div className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text font-serif text-3xl font-bold text-transparent sm:text-4xl">
            VocabAI
          </div>
          <p className="mx-auto mt-5 max-w-sm text-sm leading-7 text-white/35 sm:text-base md:mx-0 md:leading-8">
            AI-powered vocabulary extraction for readers who want to study smarter.
          </p>
        </div>

        <FooterColumn title="Product" links={['Features', 'Pricing', 'Changelog', 'Roadmap']} />
        <FooterColumn title="Resources" links={['Docs', 'Blog', 'API', 'Status']} />
        <FooterColumn title="Company" links={['About', 'Careers', 'Press', 'Contact']} />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/8 px-4 py-6 text-center text-sm text-white/25 sm:px-6 md:flex-row md:items-center md:justify-between md:text-left lg:px-10">
        <p>© 2026 VocabAI. All rights reserved</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-6 md:justify-end">
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
