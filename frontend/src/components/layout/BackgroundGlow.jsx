export default function BackgroundGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="glow-orb absolute -left-24 top-0 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl" />
      <div className="glow-orb glow-orb-delayed absolute right-[-8rem] top-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div className="glow-orb glow-orb-slow absolute bottom-[-8rem] left-1/3 h-[26rem] w-[30rem] rounded-full bg-orange-400/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.09),transparent_30%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.08),transparent_28%),linear-gradient(180deg,#080812_0%,#090914_100%)]" />
    </div>
  )
}
