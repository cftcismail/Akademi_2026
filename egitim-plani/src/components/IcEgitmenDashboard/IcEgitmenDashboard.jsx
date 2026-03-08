import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import { AYLAR } from '../../data/constants'
import { formatCurrency, getPlanCostInTry, getUniqueYears } from '../../utils/helpers'

const PIE_COLORS = ['#1e3a5f', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6']

function getAwardText(item, type) {
  if (!item) {
    return 'Henüz iç eğitim planı yok'
  }

  if (type === 'plan') {
    return `${item.plan} plan yönetimi`
  }

  if (type === 'employee') {
    return `${item.calisan} çalışan etkisi`
  }

  return `%${Math.round(item.completionRate)} tamamlanma`
}

export default function IcEgitmenDashboard({ planlar, talepler, gmyList, egitmenListesi, kurBilgileri }) {
  const years = getUniqueYears(planlar, talepler)
  const [selectedYear, setSelectedYear] = useState(years[0] || new Date().getFullYear())
  const activeYear = years.includes(selectedYear) ? selectedYear : years[0] || new Date().getFullYear()

  const internalPlans = planlar.filter((plan) => plan.icEgitim && Number(plan.egitimYili) === Number(activeYear))

  const internalRequestIds = new Set(internalPlans.map((plan) => plan.talepId).filter(Boolean))

  const internalRequests = talepler.filter(
    (talep) => Number(talep.talepYili) === Number(activeYear) && internalRequestIds.has(talep.id),
  )

  const trainerPerformance = Object.values(
    internalPlans.reduce((accumulator, plan) => {
      const key = `${plan.egitimci || 'İç Eğitmen Atanmadı'}`.trim() || 'İç Eğitmen Atanmadı'

      if (!accumulator[key]) {
        accumulator[key] = {
          ad: key,
          plan: 0,
          calisanSet: new Set(),
          tamamlanan: 0,
          ertelenen: 0,
          butce: 0,
        }
      }

      accumulator[key].plan += 1
      accumulator[key].calisanSet.add(plan.calisanSicil)
      accumulator[key].tamamlanan += plan.durum === 'tamamlandı' ? 1 : 0
      accumulator[key].ertelenen += plan.durum === 'ertelendi' || plan.durum === 'iptal edildi' ? 1 : 0
      accumulator[key].butce += getPlanCostInTry(plan, kurBilgileri)
      return accumulator
    }, {}),
  )
    .map((item) => ({
      ad: item.ad,
      plan: item.plan,
      calisan: item.calisanSet.size,
      tamamlanan: item.tamamlanan,
      ertelenen: item.ertelenen,
      butce: item.butce,
      completionRate: item.plan ? (item.tamamlanan / item.plan) * 100 : 0,
    }))
    .sort((left, right) => right.plan - left.plan || right.calisan - left.calisan)

  const monthlyInternalLoad = AYLAR.map((month, index) => ({
    month,
    plan: internalPlans.filter((plan) => plan.egitimAyi === index + 1).length,
    butce: internalPlans
      .filter((plan) => plan.egitimAyi === index + 1)
      .reduce((total, plan) => total + getPlanCostInTry(plan, kurBilgileri), 0),
  }))

  const categorySplit = Object.values(
    internalPlans.reduce((accumulator, plan) => {
      if (!accumulator[plan.kategori]) {
        accumulator[plan.kategori] = { kategori: plan.kategori, value: 0 }
      }

      accumulator[plan.kategori].value += 1
      return accumulator
    }, {}),
  )

  const gmyCoverage = gmyList
    .map((gmy) => {
      const plansByGmy = internalPlans.filter((plan) => plan.gmy === gmy)
      return {
        gmy,
        plan: plansByGmy.length,
        calisan: new Set(plansByGmy.map((plan) => plan.calisanSicil)).size,
      }
    })
    .filter((item) => item.plan > 0)

  const statusDistribution = Object.values(
    internalPlans.reduce((accumulator, plan) => {
      if (!accumulator[plan.durum]) {
        accumulator[plan.durum] = { durum: plan.durum, adet: 0 }
      }

      accumulator[plan.durum].adet += 1
      return accumulator
    }, {}),
  )

  const topPlanAward = trainerPerformance[0]
  const topEmployeeAward = [...trainerPerformance].sort((left, right) => right.calisan - left.calisan || right.plan - left.plan)[0]
  const topCompletionAward = [...trainerPerformance]
    .filter((item) => item.plan > 0)
    .sort((left, right) => right.completionRate - left.completionRate || right.plan - left.plan)[0]

  const summary = {
    totalPlan: internalPlans.length,
    trainerCount: new Set(internalPlans.map((plan) => plan.egitimci).filter(Boolean)).size,
    employeeCount: new Set(internalPlans.map((plan) => plan.calisanSicil)).size,
    totalBudget: internalPlans.reduce((total, plan) => total + getPlanCostInTry(plan, kurBilgileri), 0),
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">İç Eğitmen Dashboard</span>
          <h2>İç eğitmen etkisi, ödül adayları ve kapsama görünümü</h2>
          <p>Bu ekran yalnızca seçtiğiniz yıldaki iç eğitim planlarını analiz eder. Dış kurumlar ve diğer yıllar dahil edilmez.</p>
        </div>
        <div className="filter-row filter-row--hero">
          <label>
            <span>Yıl</span>
            <select value={activeYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <Card className="mini-stat">
            <span>Kayıtlı İç Eğitmen</span>
            <strong>{egitmenListesi.length}</strong>
          </Card>
        </div>
      </section>

      {!internalPlans.length ? (
        <EmptyState
          title="Seçilen yıl için iç eğitim kaydı yok"
          description="İç eğitim planları oluşturulduğunda burada eğitmen performansı ve ödül adayları gösterilir."
        />
      ) : (
        <>
          <section className="stats-grid">
            <Card className="mini-stat">
              <span>İç Eğitim Planı</span>
              <strong>{summary.totalPlan}</strong>
            </Card>
            <Card className="mini-stat">
              <span>Aktif İç Eğitmen</span>
              <strong>{summary.trainerCount}</strong>
            </Card>
            <Card className="mini-stat">
              <span>Eğitim Alan Çalışan</span>
              <strong>{summary.employeeCount}</strong>
            </Card>
            <Card className="mini-stat">
              <span>Toplam TL Değeri</span>
              <strong>{formatCurrency(summary.totalBudget)}</strong>
            </Card>
          </section>

          <section className="report-highlight-grid">
            <Card className="award-card">
              <span className="eyebrow">Ödül Adayı</span>
              <h3>En Çok Plan Yöneten</h3>
              <strong>{topPlanAward?.ad || 'Henüz yok'}</strong>
              <small>{getAwardText(topPlanAward, 'plan')}</small>
            </Card>
            <Card className="award-card">
              <span className="eyebrow">Ödül Adayı</span>
              <h3>En Yüksek Çalışan Etkisi</h3>
              <strong>{topEmployeeAward?.ad || 'Henüz yok'}</strong>
              <small>{getAwardText(topEmployeeAward, 'employee')}</small>
            </Card>
            <Card className="award-card">
              <span className="eyebrow">Ödül Adayı</span>
              <h3>Tamamlanma Şampiyonu</h3>
              <strong>{topCompletionAward?.ad || 'Henüz yok'}</strong>
              <small>{getAwardText(topCompletionAward, 'completion')}</small>
            </Card>
          </section>

          <section className="dashboard-grid dashboard-grid--bottom">
            <Card className="chart-card">
              <div className="section-heading">
                <div>
                  <h3>Aylık İç Eğitim Yükü</h3>
                  <p>Seçili yılda ay bazında kaç iç eğitim planlandığını görün.</p>
                </div>
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyInternalLoad}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="plan" name="Plan" fill="#1e3a5f" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="chart-card">
              <div className="section-heading">
                <div>
                  <h3>Kategori Dağılımı</h3>
                  <p>İç eğitimlerin hangi kategorilerde yoğunlaştığını izleyin.</p>
                </div>
              </div>
              <div className="chart-area chart-area--compact">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categorySplit} dataKey="value" nameKey="kategori" cx="50%" cy="50%" outerRadius={90} label>
                      {categorySplit.map((item, index) => (
                        <Cell key={item.kategori} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="dashboard-grid dashboard-grid--bottom">
            <Card className="chart-card">
              <div className="section-heading">
                <div>
                  <h3>İç Eğitmen Performans Grafiği</h3>
                  <p>En çok plan yöneten iç eğitmenleri çalışan etkisiyle birlikte görün.</p>
                </div>
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trainerPerformance.slice(0, 8)} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="ad" width={140} />
                    <Tooltip />
                    <Bar dataKey="plan" name="Plan" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                    <Bar dataKey="calisan" name="Çalışan" fill="#1e3a5f" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="chart-card">
              <div className="section-heading">
                <div>
                  <h3>GMY Kapsama Grafiği</h3>
                  <p>İç eğitimlerin hangi GMY'lere ne kadar yayıldığını izleyin.</p>
                </div>
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gmyCoverage}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="gmy" interval={0} angle={-15} textAnchor="end" height={80} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="plan" name="Plan" fill="#1e3a5f" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="dashboard-grid dashboard-grid--bottom">
            <Card className="chart-card">
              <div className="section-heading">
                <div>
                  <h3>Durum Dağılımı</h3>
                  <p>İç eğitim planlarının durum kırılımı.</p>
                </div>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Durum</th>
                      <th>Adet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusDistribution.map((item) => (
                      <tr key={item.durum}>
                        <td>{item.durum}</td>
                        <td>{item.adet}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="chart-card">
              <div className="section-heading">
                <div>
                  <h3>İç Eğitmen Skor Kartı</h3>
                  <p>Ödül sürecinde doğrudan kullanılabilecek detaylı lider tablosu.</p>
                </div>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>İç Eğitmen</th>
                      <th>Plan</th>
                      <th>Çalışan</th>
                      <th>Tamamlanan</th>
                      <th>Tamamlanma</th>
                      <th>TL Değeri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainerPerformance.map((item) => (
                      <tr key={item.ad}>
                        <td>{item.ad}</td>
                        <td>{item.plan}</td>
                        <td>{item.calisan}</td>
                        <td>{item.tamamlanan}</td>
                        <td>{`%${Math.round(item.completionRate)}`}</td>
                        <td>{formatCurrency(item.butce)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          <section className="dashboard-rich-grid">
            <Card className="insight-card">
              <span>İç Eğitim Talebi</span>
              <strong>{internalRequests.length}</strong>
              <small>İç eğitim planına dönüşen talep kaydı</small>
            </Card>
            <Card className="insight-card">
              <span>Ortalama Plan / Eğitmen</span>
              <strong>{trainerPerformance.length ? (summary.totalPlan / trainerPerformance.length).toFixed(1) : '0.0'}</strong>
              <small>Eğitmen başına ortalama iç eğitim planı</small>
            </Card>
            <Card className="insight-card">
              <span>En Yoğun GMY</span>
              <strong>{gmyCoverage[0]?.gmy || '-'}</strong>
              <small>{gmyCoverage[0] ? `${gmyCoverage[0].plan} iç eğitim planı` : 'Veri yok'}</small>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}