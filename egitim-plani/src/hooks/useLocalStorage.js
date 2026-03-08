import { useEffect, useState } from 'react'

function isSameShape(value, initialValue) {
  if (Array.isArray(initialValue)) {
    return Array.isArray(value)
  }

  if (initialValue && typeof initialValue === 'object') {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  }

  return typeof value === typeof initialValue
}

function readInitialValue(key, initialValue) {
  const storedValue = window.localStorage.getItem(key)

  if (!storedValue) {
    return initialValue
  }

  try {
    const parsedValue = JSON.parse(storedValue)
    return isSameShape(parsedValue, initialValue) ? parsedValue : initialValue
  } catch {
    return initialValue
  }
}

export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readInitialValue(key, initialValue))

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}