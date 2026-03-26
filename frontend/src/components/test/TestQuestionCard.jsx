export default function TestQuestionCard({
  question,
  currentIndex,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  onNext,
  onPrevious,
  isLastQuestion,
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Question {currentIndex + 1}/{totalQuestions}
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-white">{question.prompt}</h1>
        </div>
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100">
          {question.type}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {question.options.map((option) => {
          const isSelected = selectedAnswer === option

          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelectAnswer(option)}
              className={`flex w-full items-start justify-between rounded-2xl border px-5 py-4 text-left text-sm transition ${
                isSelected
                  ? 'border-cyan-300/40 bg-cyan-400/10 text-white'
                  : 'border-white/10 bg-slate-950/20 text-white/75 hover:border-white/20 hover:text-white'
              }`}
            >
              <span className="pr-4 leading-6">{option}</span>
              <span
                className={`mt-1 h-4 w-4 rounded-full border ${
                  isSelected ? 'border-cyan-300 bg-cyan-300' : 'border-white/25'
                }`}
              />
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedAnswer}
          className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLastQuestion ? 'Finish test' : 'Next question'}
        </button>
      </div>
    </section>
  )
}
