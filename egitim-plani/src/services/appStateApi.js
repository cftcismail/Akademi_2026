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

const LARGE_DATASET_LOCAL_STORAGE_FIELDS = new Set(['talepler', 'planlar'])
const MAX_LOCAL_STORAGE_FIELD_BYTES = Number(import.meta.env.VITE_LOCAL_STORAGE_FIELD_MAX_BYTES || 1_500_000)

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

function isQuotaExceededError(error) {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

function getSerializedSizeInBytes(value) {
  return new Blob([value]).size
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
    throw new Error(payload?.detail || payload?.error || 'Merkezi veri servisine ulasilamadi.')
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
    const serializedValue = JSON.stringify(sanitized[field])

    if (
      LARGE_DATASET_LOCAL_STORAGE_FIELDS.has(field) &&
      getSerializedSizeInBytes(serializedValue) > MAX_LOCAL_STORAGE_FIELD_BYTES
    ) {
      // Keep large tables in remote state and avoid browser storage crashes.
      window.localStorage.removeItem(storageKey)
      console.info(`[localStorage] skipped oversized field: ${field}`)
      return
    }

    try {
      window.localStorage.setItem(storageKey, serializedValue)
    } catch (error) {
      if (isQuotaExceededError(error)) {
        // Do not crash UI when browser quota is exceeded by very large imports.
        console.warn(`[localStorage] quota exceeded for key: ${storageKey}`)
        window.localStorage.removeItem(storageKey)
        return
      }

      throw error
    }
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

async function requestFormData(path, formData) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.detail || payload?.error || 'Merkezi veri servisine ulasilamadi.')
  }

  return response.json()
}

export async function uploadTaleplerExcel(file, options = {}) {
  const formData = new FormData()
  formData.set('file', file)
  formData.set('talepYili', `${Number(options.talepYili || new Date().getFullYear())}`)
  formData.set('maxIssues', `${Math.max(0, Number(options.maxIssues || 250))}`)

  return requestFormData('/import/talepler', formData)
}
