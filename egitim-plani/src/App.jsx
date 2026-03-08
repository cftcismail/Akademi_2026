import { lazy, Suspense, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import useEgitimData from './hooks/useEgitimData'
import { ADMIN_ROUTE } from './data/constants'

const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'))
const TaleplerPage = lazy(() => import('./components/Talepler/TalepListesi'))
const EgitimPlaniPage = lazy(() => import('./components/EgitimPlani/EgitimPlani'))
const Raporlar = lazy(() => import('./components/Raporlar/Raporlar'))
const CalisanDetay = lazy(() => import('./components/CalisanDetay'))
const AdminPage = lazy(() => import('./components/Admin/AdminPage'))

const ADMIN_SESSION_KEY = 'egitim-plani:admin-auth'

function readAdminAuth() {
  return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true'
}

function App() {
  const egitimData = useEgitimData()
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(readAdminAuth)

  function handleAdminAuthChange(nextValue) {
    const nextState = Boolean(nextValue)
    setIsAdminAuthenticated(nextState)

    if (nextState) {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
      return
    }

    window.sessionStorage.removeItem(ADMIN_SESSION_KEY)
  }

  return (
    <div className="app-shell app-shell--topnav">
      <div className="top-chrome">
        <Header
          metrics={{
            talepSayisi: egitimData.talepler.length,
            planSayisi: egitimData.planlar.length,
          }}
        />
        <Sidebar isAdminAuthenticated={isAdminAuthenticated} />
      </div>
      <div className="app-main app-main--topnav">
        <main className="page-shell">
          <Suspense fallback={<div className="surface-card page-loading">İçerik yükleniyor...</div>}>
            <Routes>
              <Route path="/" element={<Dashboard {...egitimData} />} />
              <Route path="/talepler" element={<TaleplerPage {...egitimData} />} />
              <Route path="/plan" element={<EgitimPlaniPage {...egitimData} />} />
              <Route path="/raporlar" element={<Raporlar {...egitimData} />} />
              <Route path="/calisanlar/:sicilNo" element={<CalisanDetay {...egitimData} />} />
              <Route
                path={ADMIN_ROUTE}
                element={
                  <AdminPage
                    {...egitimData}
                    isAdminAuthenticated={isAdminAuthenticated}
                    onAuthenticatedChange={handleAdminAuthChange}
                  />
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3200,
          style: {
            background: '#ffffff',
            color: '#1a202c',
            border: '1px solid #e2e8f0',
          },
        }}
      />
    </div>
  )
}

export default App
