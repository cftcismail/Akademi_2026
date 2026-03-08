import { Component } from 'react'
import Card from './Card'

function clearAppStorage() {
  const keysToRemove = []

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)

    if (key?.startsWith('egitim-plani:')) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key))
  window.sessionStorage.removeItem('egitim-plani:admin-auth')
  window.location.reload()
}

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Uygulama render hatasi:', error)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="page-stack">
        <Card className="admin-auth-card">
          <span className="eyebrow">Uygulama Hatası</span>
          <h2>Ekran yüklenirken bir hata oluştu</h2>
          <p>Eski tarayıcı verisi veya beklenmeyen bir kayıt uygulamanın açılmasını engellemiş olabilir.</p>
          <div className="action-row">
            <button className="button" onClick={() => window.location.reload()}>
              Sayfayı Yenile
            </button>
            <button className="button button--secondary" onClick={clearAppStorage}>
              Uygulama Verilerini Temizle
            </button>
          </div>
        </Card>
      </div>
    )
  }
}