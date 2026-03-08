import { LOCAL_STORAGE_KEYS } from '../data/constants'

const APP_STATE_STORAGE_FIELDS = {
  katalog: LOCAL_STORAGE_KEYS.katalog,
  talepler: LOCAL_STORAGE_KEYS.talepler,
  planlar: LOCAL_STORAGE_KEYS.planlar,
  gmyList: LOCAL_STORAGE_KEYS.gmyList,
  egitimKategorileri: LOCAL_STORAGE_KEYS.egitimKategorileri,
  kurumListesi: LOCAL_STORAGE_KEYS.kurumListesi,
  egitmenListesi: LOCAL_STORAGE_KEYS.egitmenListesi,
  kurBilgileri: LOCAL_STORAGE_KEYS.kurBilgileri,
}

function isSameShape(value, sample) {
  if (Array.isArray(sample)) {
    return Array.isArray(value)
  }

  if (sample && typeof sample === 'object') {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  }

  return typeof value === typeof sample
}

function getApiBaseUrl() {
  return `${import.meta.env.VITE_API_BASE_URL || '/api'}`.replace(/\/$/, '')
}

function parseStoredValue(rawValue, fallbackValue) {
  if (!rawValue) {
    return fallbackValue
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    return isSameShape(parsedValue, fallbackValue) ? parsedValue : fallbackValue
  } catch {
    return fallbackValue
  }
}

async function requestJson(path, options) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.detail || payload?.error || 'Merkezi veri servisine ulaşılamadı.')
  }

  return response.json()
}

export function isRemoteSyncEnabled() {
  return `${import.meta.env.VITE_ENABLE_REMOTE_SYNC || 'true'}`.trim().toLowerCase() !== 'false'
}

export function sanitizeAppState(candidate, defaults) {
  return Object.keys(APP_STATE_STORAGE_FIELDS).reduce((state, key) => {
    const fallbackValue = defaults[key]
    const nextValue = candidate?.[key]
    state[key] = isSameShape(nextValue, fallbackValue) ? nextValue : fallbackValue
    return state
  }, {})
}

export function readLocalAppState(defaults) {
  return Object.entries(APP_STATE_STORAGE_FIELDS).reduce((state, [field, storageKey]) => {
    state[field] = parseStoredValue(window.localStorage.getItem(storageKey), defaults[field])
    return state
  }, {})
}

export function writeLocalAppState(appState, defaults) {
  const sanitized = sanitizeAppState(appState, defaults)

  Object.entries(APP_STATE_STORAGE_FIELDS).forEach(([field, storageKey]) => {
    window.localStorage.setItem(storageKey, JSON.stringify(sanitized[field]))
  })
}

export function hasMeaningfulAppState(candidate, defaults) {
  return JSON.stringify(sanitizeAppState(candidate, defaults)) !== JSON.stringify(defaults)
}

export async function fetchRemoteAppState(defaults) {
  const payload = await requestJson('/state')
  return sanitizeAppState(payload?.data, defaults)
}

export async function replaceRemoteAppState(appState, defaults) {
  const payload = await requestJson('/state', {
    method: 'PUT',
    body: JSON.stringify({
      data: sanitizeAppState(appState, defaults),
    }),
  })

  return sanitizeAppState(payload?.data, defaults)
}