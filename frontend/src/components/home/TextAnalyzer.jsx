import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { analyzeText, fetchWordDetail, saveWord } from '../../services/api'
import KeywordList from './KeywordList'
import SelectedTextAnalysis from './SelectedTextAnalysis'
import WordModal from './WordModal'

export default function TextAnalyzer() {
  const { user, token, isAuthenticated } = useAuth()
  const [text, setText] = useState('')
  const [keywords, setKeywords] = useState([])
  const [selectedTexts, setSelectedTexts] = useState([])
  const [selectedResults, setSelectedResults] = useState([])
  const [selectedKeywords, setSelectedKeywords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [wordDetail, setWordDetail] = useState(null)
  const [wordDetailLoading, setWordDetailLoading] = useState(false)
  const [wordDetailError, setWordDetailError] = useState('')
  const [savingWord, setSavingWord] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [selectedSaveStates, setSelectedSaveStates] = useState({})
  const [toastMessage, setToastMessage] = useState('')
  const resultRef = useRef(null)
  const textareaRef = useRef(null)
  const toastTimeoutRef = useRef(null)

  const wordCount = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).length,
    [text]
  )

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  const normalizeSelectionKey = (value) => value?.trim().toLowerCase() || ''

  const showToast = (message) => {
    setToastMessage(message)

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage('')
    }, 2400)
  }

  const captureSelectedText = () => {
    const browserSelection = window.getSelection?.()?.toString().trim() || ''
    let nextSelection = browserSelection

    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    if (!nextSelection) {
      nextSelection = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd).trim()
    }

    if (!nextSelection) {
      return
    }

    setSelectedTexts((current) =>
      current.includes(nextSelection) ? current : [...current, nextSelection]
    )
  }

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please paste some text before analyzing.')
      return
    }

    setLoading(true)
    setError('')
    setKeywords([])
    setSelectedResults([])
    setSelectedKeywords([])
    setWordDetail(null)
    setWordDetailError('')
    setSaveMessage('')

    try {
      const data = await analyzeText(text, selectedTexts)
      const nextKeywords = Array.isArray(data.keywords) ? data.keywords : []
      setKeywords(nextKeywords)
      setSelectedResults(Array.isArray(data.selected) ? data.selected : [])

      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch (requestError) {
      setError(requestError.message || 'Unable to reach the analyzer service.')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeSelectedText = () => {
    handleAnalyze()
  }

  const handleKeywordClick = async (keyword) => {
    setSelectedKeywords((current) =>
      current.includes(keyword) ? current : [...current, keyword]
    )
    setWordDetail(null)
    setWordDetailError('')
    setSaveMessage('')
    setWordDetailLoading(true)

    try {
      const data = await fetchWordDetail(keyword)
      setWordDetail(data)
    } catch (requestError) {
      setWordDetailError(requestError.message || 'Unable to load word details.')
    } finally {
      setWordDetailLoading(false)
    }
  }

  const handleSaveWord = async () => {
    if (!wordDetail?.word) {
      return
    }

    if (!token) {
      setSaveMessage('Login required to save words.')
      return
    }

    setSavingWord(true)
    setSaveMessage('')

    try {
      const data = await saveWord(wordDetail.word, token)
      setSaveMessage(`"${data.word}" saved successfully.`)
    } catch (requestError) {
      setSaveMessage(requestError.message || 'Unable to save word right now.')
    } finally {
      setSavingWord(false)
    }
  }

  const getSelectedSaveState = (item) => selectedSaveStates[normalizeSelectionKey(item.text)] || 'idle'

  const handleSaveSelectedWord = async (item) => {
    const normalizedKey = normalizeSelectionKey(item.text)

    if (!item?.text || item.type !== 'word') {
      return
    }

    if (!token) {
      showToast('Login required to save words.')
      return
    }

    setSelectedSaveStates((current) => ({
      ...current,
      [normalizedKey]: 'saving',
    }))

    try {
      const data = await saveWord(item.text, token)

      setSelectedSaveStates((current) => ({
        ...current,
        [normalizedKey]: 'saved',
      }))
      showToast(data.created ? 'Word saved' : 'Word already saved')
    } catch (requestError) {
      setSelectedSaveStates((current) => ({
        ...current,
        [normalizedKey]: 'idle',
      }))
      showToast(requestError.message || 'Unable to save word right now.')
    }
  }

  return (
    <section id="analyzer" className="mx-auto max-w-5xl px-6 py-20 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-2xl border border-white/8 bg-white/[0.03] p-1 text-sm font-semibold text-white/45">
          <span className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-white shadow-[0_8px_24px_rgba(45,212,191,0.25)]">
            Analyze
          </span>
          <span className="px-5 py-3">Flashcards</span>
          <span className="px-5 py-3">History</span>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/55">
          {isAuthenticated ? (
            `Signed in as ${user.email}`
          ) : (
            <span>
              <Link to="/login" className="text-cyan-300 transition hover:text-cyan-200">
                Login
              </Link>{' '}
              to save words
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-[0_40px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-violet-500 via-pink-500 to-orange-400" />

        <div className="flex items-center justify-between px-8 pb-5 pt-7">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/30">
            Paste your text
          </p>
          <div className="flex gap-2">
            <span className="h-3.5 w-3.5 rounded-full bg-red-400" />
            <span className="h-3.5 w-3.5 rounded-full bg-amber-400" />
            <span className="h-3.5 w-3.5 rounded-full bg-green-400" />
          </div>
        </div>

        <div className="px-8">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onMouseUp={captureSelectedText}
            onKeyUp={captureSelectedText}
            onSelect={captureSelectedText}
            placeholder="Paste any article, essay, research paper, or book excerpt here..."
            className="min-h-[20rem] w-full resize-none bg-transparent font-mono text-lg leading-8 text-white/85 outline-none placeholder:text-white/30"
          />
        </div>

        <div className="mx-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="flex flex-col gap-4 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 text-sm text-white/30">
            <span>
              {text.length} chars . {wordCount} words
            </span>
            {text ? (
              <button
                type="button"
                onClick={() => {
                  setText('')
                  setKeywords([])
                  setSelectedTexts([])
                  setSelectedResults([])
                  setSelectedKeywords([])
                  setError('')
                }}
                className="font-semibold text-white/40 transition hover:text-pink-300"
              >
                Clear
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(45,212,191,0.22)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
          >
            {loading ? 'Analyzing...' : 'Analyze Text'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {selectedTexts.length > 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                Selected Texts
              </p>
              <p className="mt-2 text-sm text-white/45">
                Highlight words or phrases in the textarea to add them here before analysis.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAnalyzeSelectedText}
                disabled={loading || !text.trim() || selectedTexts.length === 0}
                className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze Text'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTexts([])}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:border-white/20 hover:text-white"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {selectedTexts.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedTexts((current) => current.filter((entry) => entry !== item))
                  }
                  className="rounded-full border border-cyan-200/20 px-2 py-0.5 text-xs text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-200/10"
                  aria-label={`Remove ${item}`}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <SelectedTextAnalysis
        selectedResults={selectedResults}
        onAnalyze={handleAnalyzeSelectedText}
        isAnalyzing={loading}
        canAnalyze={Boolean(text.trim()) && selectedTexts.length > 0}
        onSaveWord={handleSaveSelectedWord}
        getSaveState={getSelectedSaveState}
      />

      <KeywordList
        keywords={keywords}
        selectedKeywords={selectedKeywords}
        onKeywordClick={handleKeywordClick}
        resultRef={resultRef}
        onClearSelection={() => setSelectedKeywords([])}
      />

      <WordModal
        wordDetail={wordDetail}
        isLoading={wordDetailLoading}
        error={wordDetailError}
        onClose={() => {
          setWordDetail(null)
          setWordDetailError('')
          setSaveMessage('')
          setWordDetailLoading(false)
        }}
        onSave={handleSaveWord}
        isSaving={savingWord}
        saveMessage={saveMessage}
      />

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-cyan-300/20 bg-slate-950/90 px-5 py-3 text-sm font-medium text-cyan-100 shadow-[0_16px_36px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          {toastMessage}
        </div>
      ) : null}
    </section>
  )
}
