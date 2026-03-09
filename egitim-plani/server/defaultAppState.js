const defaultAppState = Object.freeze({
  katalog: [],
  talepler: [],
  planlar: [],
  gmyList: [
    'Mali Yönetim Direktörlüğü',
    'İnsan Kaynakları Direktörlüğü',
    'KKST GMY',
    'SOPT GMY',
    'BİT GMY',
    'KG GMY',
    'UİGP GMY',
  ],
  egitimKategorileri: [
    'Teknik Eğitimler',
    'Kişisel Gelişim Eğitimleri',
    'Mesleki Gelişim Eğitimleri',
    'Sertifika',
    'Konferans',
  ],
  kurumListesi: [
  ],
  egitmenListesi: [
  ],
  kurBilgileri: {
    TRY: 1,
    USD: 38,
    EUR: 41,
    GBP: 48,
  },
})

export const APP_STATE_KEYS = Object.freeze(Object.keys(defaultAppState))

function clone(value) {
  return JSON.parse(JSON.stringify(value))
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

export function cloneDefaultAppState() {
  return clone(defaultAppState)
}

export function sanitizeAppState(candidate = {}) {
  const defaults = cloneDefaultAppState()

  return APP_STATE_KEYS.reduce((state, key) => {
    const nextValue = candidate?.[key]
    state[key] = isSameShape(nextValue, defaults[key]) ? nextValue : defaults[key]
    return state
  }, {})
}