import { lazy, Suspense, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import useEgitimData from './hooks/useEgitimData'

const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'))
const TaleplerPage = lazy(() => import('./components/Talepler/TalepListesi'))
const EgitimPlaniPage = lazy(() => import('./components/EgitimPlani/EgitimPlani'))
const Raporlar = lazy(() => import('./components/Raporlar/Raporlar'))
const CalisanDetay = lazy(() => import('./components/CalisanDetay'))

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const egitimData = useEgitimData()

  return (
    <div className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="app-main">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((current) => !current)}
          metrics={{
            talepSayisi: egitimData.talepler.length,
            planSayisi: egitimData.planlar.length,
          }}
        />
        <main className="page-shell">
          <Suspense fallback={<div className="surface-card page-loading">İçerik yükleniyor...</div>}>
            <Routes>
              <Route path="/" element={<Dashboard {...egitimData} />} />
              <Route path="/talepler" element={<TaleplerPage {...egitimData} />} />
              <Route path="/plan" element={<EgitimPlaniPage {...egitimData} />} />
              <Route path="/raporlar" element={<Raporlar {...egitimData} />} />
              <Route path="/calisanlar/:sicilNo" element={<CalisanDetay {...egitimData} />} />
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
