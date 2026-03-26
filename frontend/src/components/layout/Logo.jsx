export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-500 text-xl font-black text-white shadow-[0_0_30px_rgba(34,211,238,0.35)]">
        V
      </div>
      <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 bg-clip-text font-serif text-3xl font-bold tracking-tight text-transparent">
        VocabAI
      </span>
    </div>
  )
}
