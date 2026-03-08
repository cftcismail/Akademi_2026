import { useEffect, useState } from 'react'

function readInitialValue(key, initialValue) {
  const storedValue = window.localStorage.getItem(key)

  if (!storedValue) {
    return initialValue
  }

  try {
    return JSON.parse(storedValue)
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