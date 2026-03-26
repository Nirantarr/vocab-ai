import { useEffect, useMemo, useState } from 'react'
import StatsCards from '../components/dashboard/StatsCards'
import WordList from '../components/dashboard/WordList'
import { useAuth } from '../context/AuthContext'
import { fetchUserStats, fetchUserWords, markLearned } from '../services/api'
import { filterWordsByQuery, groupWordsByAlphabet, sortWordsForDashboard } from '../services/wordCatalog'

const initialStats = {
  totalWords: 0,
  learnedWords: 0,
}

export default function DashboardPage() {
  const { user, token } = useAuth()
  const [stats, setStats] = useState(initialStats)
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingWord, setUpdatingWord] = useState('')

  const filteredWords = useMemo(
    () => filterWordsByQuery(words, searchQuery),
    [searchQuery, words]
  )
  const groupedWords = useMemo(
    () => groupWordsByAlphabet(filteredWords),
    [filteredWords]
  )

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      setLoading(true)
      setError('')

      try {
        const [statsData, wordsData] = await Promise.all([
          fetchUserStats(token),
          fetchUserWords(token),
        ])

        if (!isMounted) {
          return
        }

        setStats(statsData)
        setWords(sortWordsForDashboard(wordsData))
      } catch (requestError) {
        if (!isMounted) {
          return
        }

        setError(requestError.message || 'Unable to load dashboard.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [token])

  const handleToggleLearned = async (word, isLearned) => {
    setUpdatingWord(word)
    setError('')

    const previousWords = words
    const previousStats = stats
    const nextWords = sortWordsForDashboard(
      words.map((entry) =>
        entry.word === word ? { ...entry, isLearned, lastSeen: new Date().toISOString() } : entry
      )
    )
    const learnedDelta = (isLearned ? 1 : 0) - (words.find((entry) => entry.word === word)?.isLearned ? 1 : 0)

    setWords(nextWords)
    setStats((currentStats) => ({
      ...currentStats,
      learnedWords: Math.max(0, currentStats.learnedWords + learnedDelta),
    }))

    try {
      const updatedWord = await markLearned(word, isLearned, token)

      setWords((currentWords) =>
        sortWordsForDashboard(
          currentWords.map((entry) => (entry.id === updatedWord.id ? updatedWord : entry))
        )
      )
    } catch (requestError) {
      setWords(previousWords)
      setStats(previousStats)
      setError(requestError.message || 'Unable to update learned status.')
    } finally {
      setUpdatingWord('')
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
      <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Dashboard
          </p>
          <h1 className="mt-3 font-serif text-5xl font-bold text-white">Your vocabulary progress</h1>
          <p className="mt-4 text-lg text-white/45">
            Track saved words, surface unfinished review items, and keep your reading gains organized.
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-5 py-4 text-sm text-cyan-100">
          Signed in as {user.email}
        </div>
      </div>

      {error ? (
        <div className="mb-8 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8 text-white/45">
          Loading your dashboard...
        </div>
      ) : (
        <div className="space-y-10">
          <StatsCards stats={stats} />
          <WordList
            totalWords={words.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sections={groupedWords}
            updatingWord={updatingWord}
            onToggleLearned={handleToggleLearned}
          />
        </div>
      )}
    </section>
  )
}
