import { useMemo, useState } from 'react'
import { addDays, parseISO } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AYLAR } from '../../data/constants'
import { downloadCsv, formatCurrency, formatDate, getUniqueYears } from '../../utils/helpers'
import Card from '../ui/Card'

function formatPercent(value) {
  return `%${Math.round(value || 0)}`
}

export default function Raporlar({ planlar, talepler, gmyList }) {
  const years = getUniqueYears(planlar)
  const [selectedYear, setSelectedYear] = useState(years[0])
  const [selectedGmy, setSelectedGmy] = useState('Tümü')
  const activeGmy = selectedGmy === 'Tümü' || gmyList.includes(selectedGmy) ? selectedGmy : 'Tümü'
  const futureThreshold = addDays(new Date(), 60)

  const currentYearPlans = planlar.filter(
    (plan) => plan.egitimYili === Number(selectedYear) && (activeGmy === 'Tümü' || plan.gmy === activeGmy),
  )
  const previousYearPlans = planlar.filter(
    (plan) => plan.egitimYili === Number(selectedYear) - 1 && (activeGmy === 'Tümü' || plan.gmy === activeGmy),
  )
  const currentYearRequests = talepler.filter(
    (talep) => Number(talep.talepYili) === Number(selectedYear) && (activeGmy === 'Tümü' || talep.gmy === activeGmy),
  )

  const totalPlan = currentYearPlans.length
  const totalBudget = currentYearPlans.reduce((total, plan) => total + Number(plan.maliyet || 0), 0)
  const completedCount = currentYearPlans.filter((plan) => plan.durum === 'tamamlandı').length
  const conversionRate = currentYearRequests.length
    ? (currentYearRequests.filter((talep) => talep.durum === 'plana_eklendi').length / currentYearRequests.length) * 100
    : 0
  const completionRate = totalPlan ? (completedCount / totalPlan) * 100 : 0

  const summaryCards = [
    {
      label: 'Talep',
      current: currentYearRequests.length,
      previous: previousYearPlans.length,
    },
    {
      label: 'Plan',
      current: totalPlan,
      previous: previousYearPlans.length,
    },
    {
      label: 'Dönüşüm',
      current: formatPercent(conversionRate),
      previous: formatPercent(
        previousYearPlans.length
          ? (previousYearPlans.length / Math.max(previousYearPlans.length, 1)) * 100
          : 0,
      ),
    },
    {
      label: 'Bütçe',
      current: formatCurrency(totalBudget),
      previous: formatCurrency(previousYearPlans.reduce((total, plan) => total + Number(plan.maliyet || 0), 0)),
    },
  ]

  const monthlyLoad = AYLAR.map((month, index) => ({
    month,
    count: currentYearPlans.filter((plan) => plan.egitimAyi === index + 1).length,
    budget: currentYearPlans
      .filter((plan) => plan.egitimAyi === index + 1)
      .reduce((total, plan) => total + Number(plan.maliyet || 0), 0),
  }))

  const gmyScorecard = gmyList
    .map((gmy) => {
      const plansByGmy = currentYearPlans.filter((plan) => plan.gmy === gmy)
      const requestsByGmy = currentYearRequests.filter((talep) => talep.gmy === gmy)

      return {
        gmy,
        talep: requestsByGmy.length,
        plan: plansByGmy.length,
        tamamlanan: plansByGmy.filter((plan) => plan.durum === 'tamamlandı').length,
        butce: plansByGmy.reduce((total, plan) => total + Number(plan.maliyet || 0), 0),
      }
    })
    .filter((item) => item.talep || item.plan)

  const demandCoverage = useMemo(
    () =>
      Object.values(
        currentYearRequests.flatMap((talep) => talep.egitimler).reduce((accumulator, egitim) => {
          if (!accumulator[egitim.egitimAdi]) {
            accumulator[egitim.egitimAdi] = {
              egitimAdi: egitim.egitimAdi,
              kategori: egitim.kategori,
              talep: 0,
              plan: 0,
            }
          }

          accumulator[egitim.egitimAdi].talep += 1
          return accumulator
        }, {}),
      )
        .map((item) => ({
          ...item,
          plan: currentYearPlans.filter((plan) => plan.egitimAdi === item.egitimAdi).length,
        }))
        .map((item) => ({
          ...item,
          acik: Math.max(item.talep - item.plan, 0),
        }))
        .sort((left, right) => right.acik - left.acik || right.talep - left.talep)
        .slice(0, 10),
    [currentYearPlans, currentYearRequests],
  )

  const upcomingPlans = currentYearPlans
    .filter((plan) => plan.egitimTarihi && parseISO(plan.egitimTarihi) <= futureThreshold)
    .sort((left, right) => left.egitimTarihi.localeCompare(right.egitimTarihi))
    .slice(0, 8)

  function handleExport() {
    downloadCsv(
      `egitim-plani-${selectedYear}.csv`,
      currentYearPlans.map((plan) => ({
        'Talep Yılı': plan.egitimYili,
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
          <h2>Geçmiş yıl karşılaştırmalı eğitim raporları</h2>
          <p>Talep, plan, bütçe ve GMY performansını aynı rapor setinde karşılaştırın.</p>
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
          <label>
            <span>GMY</span>
            <select value={activeGmy} onChange={(event) => setSelectedGmy(event.target.value)}>
              <option value="Tümü">Tümü</option>
              {gmyList.map((gmy) => (
                <option key={gmy} value={gmy}>
                  {gmy}
                </option>
              ))}
            </select>
          </label>
          <button className="button" onClick={handleExport}>
            Excel'e Aktar
          </button>
        </div>
      </section>

      <section className="report-highlight-grid">
        {summaryCards.map((item) => (
          <Card key={item.label} className="comparison-card">
            <span>{item.label}</span>
            <strong>{item.current}</strong>
            <small>{`${selectedYear - 1}: ${item.previous}`}</small>
          </Card>
        ))}
      </section>

      <section className="dashboard-rich-grid">
        <Card className="insight-card">
          <span>Tamamlanma Oranı</span>
          <strong>{formatPercent(completionRate)}</strong>
          <small>{`${completedCount} eğitim tamamlandı`}</small>
        </Card>
        <Card className="insight-card">
          <span>Toplam Bütçe</span>
          <strong>{formatCurrency(totalBudget)}</strong>
          <small>{`${totalPlan ? formatCurrency(totalBudget / totalPlan) : formatCurrency(0)} ortalama bütçe`}</small>
        </Card>
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h3>Aylık Plan ve Bütçe</h3>
              <p>Ay bazında plan adedi ve harcama eğrisini birlikte izleyin</p>
            </div>
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyLoad}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value, name) => [name === 'budget' ? formatCurrency(value) : value, name === 'budget' ? 'Bütçe' : 'Plan']} />
                <Legend />
                <Bar yAxisId="left" dataKey="count" name="Plan" fill="#1e3a5f" radius={[8, 8, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="budget" name="Bütçe" stroke="#f59e0b" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h3>GMY Skor Kartı</h3>
              <p>Talep-plan dönüşümü ve bütçe yükü</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>GMY</th>
                  <th>Talep</th>
                  <th>Plan</th>
                  <th>Tamamlanan</th>
                  <th>Bütçe</th>
                </tr>
              </thead>
              <tbody>
                {gmyScorecard.map((item) => (
                  <tr key={item.gmy}>
                    <td>{item.gmy}</td>
                    <td>{item.talep}</td>
                    <td>{item.plan}</td>
                    <td>{item.tamamlanan}</td>
                    <td>{formatCurrency(item.butce)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h3>Talep Açığı</h3>
              <p>Talep edilen ama plan karşılığı eksik kalan eğitimler</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Eğitim</th>
                  <th>Kategori</th>
                  <th>Talep</th>
                  <th>Plan</th>
                  <th>Açık</th>
                </tr>
              </thead>
              <tbody>
                {demandCoverage.map((item) => (
                  <tr key={item.egitimAdi}>
                    <td>{item.egitimAdi}</td>
                    <td>{item.kategori}</td>
                    <td>{item.talep}</td>
                    <td>{item.plan}</td>
                    <td>{item.acik}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h3>Yaklaşan Eğitimler</h3>
              <p>Önümüzdeki 60 gün içindeki planlı eğitimler</p>
            </div>
          </div>
          <div className="stack-list">
            {upcomingPlans.length ? (
              upcomingPlans.map((plan) => (
                <div key={plan.id} className="insight-list-item">
                  <div>
                    <strong>{plan.egitimAdi}</strong>
                    <small>{`${plan.calisanAdi} • ${plan.gmy}`}</small>
                  </div>
                  <div className="insight-list-item__meta">
                    <strong>{formatDate(plan.egitimTarihi)}</strong>
                    <small>{`${plan.egitimci} • ${formatCurrency(plan.maliyet)}`}</small>
                  </div>
                </div>
              ))
            ) : (
              <p>Önümüzdeki 60 gün içinde planlı eğitim görünmüyor.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  )
}