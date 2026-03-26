function normalizeSearchValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function getAlphabetGroup(value) {
  const normalizedValue = normalizeSearchValue(value)
  const firstCharacter = normalizedValue.charAt(0)

  if (/[a-z]/.test(firstCharacter)) {
    return firstCharacter.toUpperCase()
  }

  return '#'
}

export function compareWordsForDashboard(left, right) {
  const leftGroup = getAlphabetGroup(left?.word)
  const rightGroup = getAlphabetGroup(right?.word)

  if (leftGroup !== rightGroup) {
    if (leftGroup === '#') {
      return 1
    }

    if (rightGroup === '#') {
      return -1
    }

    return leftGroup.localeCompare(rightGroup)
  }

  const learnedDelta = Number(Boolean(left?.isLearned)) - Number(Boolean(right?.isLearned))

  if (learnedDelta !== 0) {
    return learnedDelta
  }

  const leftLastSeen = left?.lastSeen ? new Date(left.lastSeen).getTime() : 0
  const rightLastSeen = right?.lastSeen ? new Date(right.lastSeen).getTime() : 0

  if (leftLastSeen !== rightLastSeen) {
    return rightLastSeen - leftLastSeen
  }

  return normalizeSearchValue(left?.word).localeCompare(normalizeSearchValue(right?.word))
}

export function sortWordsForDashboard(words = []) {
  return [...words].sort(compareWordsForDashboard)
}

export function filterWordsByQuery(words = [], query = '') {
  const normalizedQuery = normalizeSearchValue(query)

  if (!normalizedQuery) {
    return words
  }

  return words.filter((word) => {
    const haystack = [
      word?.word,
      word?.meaning,
      ...(Array.isArray(word?.synonyms) ? word.synonyms : []),
      ...(Array.isArray(word?.antonyms) ? word.antonyms : []),
    ]
      .map(normalizeSearchValue)
      .filter(Boolean)
      .join(' ')

    return haystack.includes(normalizedQuery)
  })
}

export function groupWordsByAlphabet(words = []) {
  return words.reduce((sections, word) => {
    const letter = getAlphabetGroup(word?.word)
    const currentSection = sections[sections.length - 1]

    if (!currentSection || currentSection.letter !== letter) {
      sections.push({
        letter,
        items: [word],
      })

      return sections
    }

    currentSection.items.push(word)
    return sections
  }, [])
}
