import { useMemo, useState } from 'react'
import TestConfigCard from '../components/test/TestConfigCard'
import TestQuestionCard from '../components/test/TestQuestionCard'
import TestResults from '../components/test/TestResults'
import { useAuth } from '../context/AuthContext'
import { fetchQuiz } from '../services/api'

const DEFAULT_LIMIT = 5

export default function TestPage() {
  const { token } = useAuth()
  const [selectedLimit, setSelectedLimit] = useState(DEFAULT_LIMIT)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(false)

  const currentQuestion = questions[currentIndex]
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : ''

  const results = useMemo(
    () =>
      questions.map((question) => ({
        ...question,
        selectedAnswer: answers[question.id] || '',
      })),
    [answers, questions]
  )
  const score = useMemo(
    () => results.filter((item) => item.selectedAnswer === item.correctAnswer).length,
    [results]
  )
  const percentage = results.length ? Math.round((score / results.length) * 100) : 0

  const handleStart = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await fetchQuiz(selectedLimit, token)
      setQuestions(data.questions || [])
      setAnswers({})
      setCurrentIndex(0)
      setCompleted(false)
    } catch (requestError) {
      setError(requestError.message || 'Unable to start the test.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAnswer = (option) => {
    if (!currentQuestion) {
      return
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: option,
    }))
  }

  const handleNext = () => {
    if (currentIndex === questions.length - 1) {
      setCompleted(true)
      return
    }

    setCurrentIndex((index) => index + 1)
  }

  const handlePrevious = () => {
    setCurrentIndex((index) => Math.max(0, index - 1))
  }

  const handleRestart = () => {
    setQuestions([])
    setAnswers({})
    setCurrentIndex(0)
    setCompleted(false)
    setError('')
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 lg:px-10">
      {questions.length === 0 ? (
        <TestConfigCard
          selectedLimit={selectedLimit}
          onSelectLimit={setSelectedLimit}
          onStart={handleStart}
          loading={loading}
          error={error}
        />
      ) : completed ? (
        <TestResults
          results={results}
          score={score}
          percentage={percentage}
          onRestart={handleRestart}
        />
      ) : (
        <TestQuestionCard
          question={currentQuestion}
          currentIndex={currentIndex}
          totalQuestions={questions.length}
          selectedAnswer={selectedAnswer}
          onSelectAnswer={handleSelectAnswer}
          onNext={handleNext}
          onPrevious={handlePrevious}
          isLastQuestion={currentIndex === questions.length - 1}
        />
      )}
    </section>
  )
}
