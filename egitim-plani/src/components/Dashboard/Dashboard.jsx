import { useMemo, useState } from 'react'
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AYLAR, DURUM_LISTESI, KPI_KARTLARI } from '../../data/constants'
import { formatCurrency, formatDate, getUniqueYears } from '../../utils/helpers'
import Card from '../ui/Card'
import AylikPlanChart from './AylikPlanChart'
import EgitimDurumChart from './EgitimDurumChart'
import GMYChart from './GMYChart'
import StatCard from './StatCard'
import TopEgitimlerChart from './TopEgitimlerChart'

function formatPercent(value) {
  return `%${Math.round(value || 0)}`
}

export default function Dashboard({ planlar, talepler, gmyList, katalog }) {
  const years = getUniqueYears(planlar)
  const [selectedYear, setSelectedYear] = useState(years[0])
  const [selectedGmy, setSelectedGmy] = useState('Tümü')
  const activeGmy = selectedGmy === 'Tümü' || gmyList.includes(selectedGmy) ? selectedGmy : 'Tümü'
  const today = new Date()
  const nextThirtyDays = addDays(today, 30)

  const filteredPlans = planlar.filter(
    (plan) => plan.egitimYili === Number(selectedYear) && (activeGmy === 'Tümü' || plan.gmy === activeGmy),
  )

  const filteredTalepler = talepler.filter(
    (talep) => activeGmy === 'Tümü' || talep.gmy === activeGmy,
  )
  const previousYearPlans = planlar.filter(
    (plan) => plan.egitimYili === Number(selectedYear) - 1 && (activeGmy === 'Tümü' || plan.gmy === activeGmy),
  )
  const currentYearRequests = filteredTalepler.filter((talep) => Number(talep.talepYili) === Number(selectedYear))
  const previousYearRequests = talepler.filter(
    (talep) =>
      Number(talep.talepYili) === Number(selectedYear) - 1 && (activeGmy === 'Tümü' || talep.gmy === activeGmy),
  )

  const filteredCatalogCount =
    activeGmy === 'Tümü'
      ? katalog.length
      : katalog.filter((item) =>
          filteredTalepler.some((talep) => talep.egitimler.some((egitim) => egitim.egitimAdi === item.ad)),
        ).length

  const stats = {
    toplam: filteredPlans.length,
    yillikPlan: filteredPlans.filter((plan) => plan.egitimTuru === 'Yıllık Plan').length,
    planDisi: filteredPlans.filter((plan) => plan.egitimTuru === 'Yıllık Plan Dışı').length,
    calisan: new Set(filteredPlans.map((plan) => plan.calisanSicil)).size,
  }

  const pendingRequestCount = filteredTalepler.filter((talep) => talep.durum === 'beklemede').length
  const plannedRequestCount = filteredTalepler.filter((talep) => talep.durum === 'plana_eklendi').length
  const conversionRate = filteredTalepler.length ? (plannedRequestCount / filteredTalepler.length) * 100 : 0
  const completionCount = filteredPlans.filter((plan) => plan.durum === 'tamamlandı').length
  const completionRate = filteredPlans.length ? (completionCount / filteredPlans.length) * 100 : 0
  const totalBudget = filteredPlans.reduce((total, plan) => total + Number(plan.maliyet || 0), 0)
  const averageBudget = filteredPlans.length ? totalBudget / filteredPlans.length : 0
  const previousBudget = previousYearPlans.reduce((total, plan) => total + Number(plan.maliyet || 0), 0)

  const operationsPulse = [
    {
      label: 'Bekleyen Talep',
      value: pendingRequestCount,
      meta: `${filteredTalepler.length} toplam talep içinde`,
    },
    {
      label: 'Dönüşüm Oranı',
      value: formatPercent(conversionRate),
      meta: `${plannedRequestCount} talep planlandı`,
    },
    {
      label: 'Tamamlanma Oranı',
      value: formatPercent(completionRate),
      meta: `${completionCount} eğitim tamamlandı`,
    },
    {
      label: '30 Günlük Takvim',
      value: filteredPlans.filter((plan) => {
        if (!plan.egitimTarihi) {
          return false
        }

        const planDate = parseISO(plan.egitimTarihi)
        return planDate >= today && planDate <= nextThirtyDays
      }).length,
      meta: 'Yaklaşan eğitim sayısı',
    },
    {
      label: 'Toplam Bütçe',
      value: formatCurrency(totalBudget),
      meta: `Ortalama ${formatCurrency(averageBudget)} / eğitim`,
    },
    {
      label: 'Katalog Kapsamı',
      value: filteredCatalogCount,
      meta: `${katalog.length} kayıtlı eğitim içinde`,
    },
  ]

  const comparisonCards = [
    {
      label: `${selectedYear} Talep`,
      current: currentYearRequests.length,
      previous: previousYearRequests.length,
    },
    {
      label: `${selectedYear} Plan`,
      current: filteredPlans.length,
      previous: previousYearPlans.length,
    },
    {
      label: 'Toplam Bütçe',
      current: formatCurrency(totalBudget),
      previous: formatCurrency(previousBudget),
    },
  ]

  const monthlyData = AYLAR.map((ay, index) => ({
    ay,
    yillikPlan: filteredPlans.filter(
      (plan) => plan.egitimAyi === index + 1 && plan.egitimTuru === 'Yıllık Plan',
    ).length,
    planDisi: filteredPlans.filter(
      (plan) => plan.egitimAyi === index + 1 && plan.egitimTuru === 'Yıllık Plan Dışı',
    ).length,
  }))

  const statusData = DURUM_LISTESI.map((status) => ({
    name: status,
    value: filteredPlans.filter((plan) => plan.durum === status).length,
  })).filter((item) => item.value > 0)

  const gmyData = gmyList
    .map((gmy) => {
      const plansByGmy = filteredPlans.filter((plan) => plan.gmy === gmy)
      const requestsByGmy = filteredTalepler.filter((talep) => talep.gmy === gmy)

      return {
        gmy,
        count: plansByGmy.length,
        calisan: new Set(plansByGmy.map((plan) => plan.calisanSicil)).size,
        egitimCesidi: new Set(plansByGmy.map((plan) => plan.egitimAdi)).size,
        talep: requestsByGmy.length,
        bekleyen: requestsByGmy.filter((talep) => talep.durum === 'beklemede').length,
        maliyet: plansByGmy.reduce((total, plan) => total + Number(plan.maliyet || 0), 0),
      }
    })
    .filter((item) => item.count > 0)

  const topEgitimler = Object.values(
    filteredTalepler
      .flatMap((talep) => talep.egitimler)
      .reduce((accumulator, egitim) => {
        if (!accumulator[egitim.egitimAdi]) {
          accumulator[egitim.egitimAdi] = {
            egitimAdi: egitim.egitimAdi,
            talepSayisi: 0,
          }
        }

        accumulator[egitim.egitimAdi].talepSayisi += 1
        return accumulator
      }, {}),
  )
    .sort((left, right) => right.talepSayisi - left.talepSayisi)
    .slice(0, 10)

  const demandByCategory = useMemo(
    () =>
      Object.values(
        filteredTalepler.flatMap((talep) => talep.egitimler).reduce((accumulator, egitim) => {
          if (!accumulator[egitim.kategori]) {
            accumulator[egitim.kategori] = {
              kategori: egitim.kategori,
              talep: 0,
              plan: 0,
            }
          }

          accumulator[egitim.kategori].talep += 1
          return accumulator
        }, {}),
      )
        .map((item) => ({
          ...item,
          plan: filteredPlans.filter((plan) => plan.kategori === item.kategori).length,
        }))
        .sort((left, right) => right.talep - left.talep),
    [filteredPlans, filteredTalepler],
  )

  const demandCoverage = Object.values(
    filteredTalepler.flatMap((talep) => talep.egitimler).reduce((accumulator, egitim) => {
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
      plan: filteredPlans.filter((plan) => plan.egitimAdi === item.egitimAdi).length,
    }))
    .map((item) => ({
      ...item,
      acik: Math.max(item.talep - item.plan, 0),
    }))
    .sort((left, right) => right.acik - left.acik || right.talep - left.talep)
    .slice(0, 8)

  const upcomingPlans = filteredPlans
    .filter((plan) => {
      if (!plan.egitimTarihi) {
        return false
      }

      const planDate = parseISO(plan.egitimTarihi)
      return planDate >= today && planDate <= nextThirtyDays
    })
    .sort((left, right) => left.egitimTarihi.localeCompare(right.egitimTarihi))
    .slice(0, 6)

  const delayedPlans = filteredPlans
    .filter((plan) => plan.durum === 'ertelendi' || plan.durum === 'iptal edildi')
    .slice(0, 6)

  const statHints = {
    toplam: 'Seçili filtreye göre aktif plan kayıtları',
    yillikPlan: 'Yıllık plana dahil edilen eğitimler',
    planDisi: 'Anlık ihtiyaçtan gelen plan dışı kayıtlar',
    calisan: 'Benzersiz sicil numarasına göre hesaplanır',
  }

  const statAccents = {
    toplam: 'primary',
    yillikPlan: 'teal',
    planDisi: 'amber',
    calisan: 'slate',
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Yönetim Özeti</span>
          <h2>Kurumsal eğitim planının operasyonel ve stratejik görünümü</h2>
          <p>
            Talep yükünü, plan dönüşümünü, yaklaşan eğitimleri ve bütçe baskısını aynı ekranda
            görün. Dashboard artık yalnızca planı değil, tüm eğitim hattını birlikte okur.
          </p>
        </div>
        <div className="filter-row filter-row--hero">
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
        </div>
      </section>

      <section className="stats-grid">
        {KPI_KARTLARI.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={stats[card.key]}
            hint={statHints[card.key]}
            accent={statAccents[card.key]}
          />
        ))}
      </section>

      <section className="dashboard-rich-grid">
        {operationsPulse.map((item) => (
          <Card key={item.label} className="insight-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.meta}</small>
          </Card>
        ))}
      </section>

      <section className="report-highlight-grid">
        {comparisonCards.map((item) => (
          <Card key={item.label} className="comparison-card">
            <span>{item.label}</span>
            <strong>{item.current}</strong>
            <small>{`${selectedYear - 1}: ${item.previous}`}</small>
          </Card>
        ))}
      </section>

      <section className="dashboard-grid dashboard-grid--top">
        <AylikPlanChart data={monthlyData} />
        <EgitimDurumChart data={statusData} />
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <GMYChart data={gmyData} />
        <TopEgitimlerChart data={topEgitimler} />
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h3>Kategori Bazlı Talep ve Plan</h3>
              <p>Hangi eğitim kategorilerinde talep planın önünde gidiyor görün</p>
            </div>
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandByCategory} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="kategori" width={120} />
                <Tooltip />
                <Bar dataKey="talep" name="Talep" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                <Bar dataKey="plan" name="Plan" fill="#1e3a5f" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h3>Talep Açığı En Yüksek Eğitimler</h3>
              <p>Talep sayısı yüksek olup plan karşılığı geride kalan başlıklar</p>
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
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h3>Yaklaşan Eğitim Takvimi</h3>
              <p>Önümüzdeki 30 gün içindeki eğitim yükü</p>
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
                    <small>{`${differenceInCalendarDays(parseISO(plan.egitimTarihi), today)} gün kaldı`}</small>
                  </div>
                </div>
              ))
            ) : (
              <p>Önümüzdeki 30 gün için planlı eğitim bulunmuyor.</p>
            )}
          </div>
        </Card>

        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h3>Operasyon Uyarıları</h3>
              <p>Ertelenen veya iptal edilen eğitim kayıtlarını görün</p>
            </div>
          </div>
          <div className="stack-list">
            {delayedPlans.length ? (
              delayedPlans.map((plan) => (
                <div key={plan.id} className="insight-list-item insight-list-item--warning">
                  <div>
                    <strong>{plan.egitimAdi}</strong>
                    <small>{`${plan.calisanAdi} • ${plan.gmy}`}</small>
                  </div>
                  <div className="insight-list-item__meta">
                    <strong>{plan.durum}</strong>
                    <small>{formatDate(plan.egitimTarihi)}</small>
                  </div>
                </div>
              ))
            ) : (
              <p>Şu an ertelenen veya iptal edilen eğitim kaydı bulunmuyor.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  )
}
