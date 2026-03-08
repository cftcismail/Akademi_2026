import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AYLAR } from '../../data/constants'
import { downloadCsv, formatCurrency, getUniqueYears } from '../../utils/helpers'
import Card from '../ui/Card'

export default function Raporlar({ planlar, gmyList }) {
  const years = getUniqueYears(planlar)
  const [selectedYear, setSelectedYear] = useState(years[0])

  const currentYearPlans = planlar.filter((plan) => plan.egitimYili === Number(selectedYear))
  const previousYearPlans = planlar.filter((plan) => plan.egitimYili === Number(selectedYear) - 1)

  const totalPlan = currentYearPlans.length
  const previousTotalPlan = previousYearPlans.length
  const planDelta = previousTotalPlan ? Math.round(((totalPlan - previousTotalPlan) / previousTotalPlan) * 100) : 100
  const uniqueEmployees = new Set(currentYearPlans.map((plan) => plan.calisanSicil)).size
  const averageTraining = uniqueEmployees ? (totalPlan / uniqueEmployees).toFixed(1) : '0.0'
  const yillikPlan = currentYearPlans.filter((plan) => plan.egitimTuru === 'Yıllık Plan').length
  const planDisi = currentYearPlans.filter((plan) => plan.egitimTuru === 'Yıllık Plan Dışı').length

  const gmySummary = gmyList.map((gmy) => ({
    gmy,
    count: currentYearPlans.filter((plan) => plan.gmy === gmy).length,
  })).filter((item) => item.count > 0)

  const topEmployees = Object.values(
    currentYearPlans.reduce((accumulator, plan) => {
      if (!accumulator[plan.calisanSicil]) {
        accumulator[plan.calisanSicil] = {
          calisanAdi: plan.calisanAdi,
          calisanSicil: plan.calisanSicil,
          calisanKullaniciKodu: plan.calisanKullaniciKodu,
          count: 0,
        }
      }

      accumulator[plan.calisanSicil].count += 1
      return accumulator
    }, {}),
  )
    .sort((left, right) => right.count - left.count)
    .slice(0, 10)

  const monthlyLoad = AYLAR.map((month, index) => ({
    month,
    count: currentYearPlans.filter((plan) => plan.egitimAyi === index + 1).length,
  }))

  function handleExport() {
    downloadCsv(
      `egitim-plani-${selectedYear}.csv`,
      currentYearPlans.map((plan) => ({
        'Çalışan Adı': plan.calisanAdi,
        Sicil: plan.calisanSicil,
        'Kullanıcı Kodu': plan.calisanKullaniciKodu,
        GMY: plan.gmy,
        Eğitim: plan.egitimAdi,
        Kategori: plan.kategori,
        'Eğitim Türü': plan.egitimTuru,
        'Planlanma Tarihi': plan.planlanmaTarihi,
        'Eğitim Tarihi': plan.egitimTarihi,
        Süre: plan.sure,
        Eğitimci: plan.egitimci,
        Durum: plan.durum,
        Maliyet: plan.maliyet,
      })),
    )
  }

  return (
    <div className="page-stack">
      <section className="page-toolbar">
        <Card className="surface-card--accent">
          <span className="eyebrow">Yönetim Raporları</span>
          <h2>Üst yönetim için özet metrikler ve ihracat görünümü</h2>
          <p>Plan yoğunluğunu, GMY bazlı dağılımı ve en çok eğitim planlanan çalışanları izleyin.</p>
        </Card>
        <div className="toolbar-actions">
          <label>
            <span>Yıl</span>
            <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <button className="button" onClick={handleExport}>
            Excel'e Aktar
          </button>
        </div>
      </section>

      <section className="stats-grid reports-grid">
        <Card className="report-card">
          <span>Yıl içinde kaç eğitim planlandı?</span>
          <strong>{totalPlan}</strong>
          <small>Önceki yıla göre %{planDelta}</small>
        </Card>
        <Card className="report-card">
          <span>Kaçı yıllık plan içinde / dışında?</span>
          <strong>
            {yillikPlan} / {planDisi}
          </strong>
          <small>Toplam plan bazında dağılım</small>
        </Card>
        <Card className="report-card">
          <span>Toplamda kaç kişiye planlandı?</span>
          <strong>{uniqueEmployees}</strong>
          <small>Benzersiz sicil numarası sayısı</small>
        </Card>
        <Card className="report-card">
          <span>1 çalışan için ortalama kaç eğitim?</span>
          <strong>{averageTraining}</strong>
          <small>Toplam plan / benzersiz çalışan</small>
        </Card>
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h3>GMY bazlı dağılım</h3>
              <p>Her GMY için planlanan eğitim sayısı</p>
            </div>
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gmySummary}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="gmy" angle={-16} textAnchor="end" height={72} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1e3a5f" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="section-heading">
            <div>
              <h3>En çok eğitim planlanan çalışanlar</h3>
              <p>Top 10 çalışan listesi</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Çalışan</th>
                  <th>Sicil</th>
                  <th>Kullanıcı Kodu</th>
                  <th>Eğitim Sayısı</th>
                </tr>
              </thead>
              <tbody>
                {topEmployees.map((employee) => (
                  <tr key={employee.calisanSicil}>
                    <td>{employee.calisanAdi}</td>
                    <td>{employee.calisanSicil}</td>
                    <td>{employee.calisanKullaniciKodu || '-'}</td>
                    <td>{employee.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <Card className="chart-card">
        <div className="section-heading">
          <div>
            <h3>Aya göre yük dağılımı</h3>
            <p>Plan yoğunluğunu ay bazında izleyin</p>
          </div>
        </div>
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyLoad}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0f766e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="report-meta">
          <span>Toplam maliyet: {formatCurrency(currentYearPlans.reduce((total, plan) => total + Number(plan.maliyet || 0), 0))}</span>
          <span>Plan dışı oranı: %{totalPlan ? Math.round((planDisi / totalPlan) * 100) : 0}</span>
        </div>
      </Card>
    </div>
  )
}