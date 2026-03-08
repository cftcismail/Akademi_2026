import { useState } from 'react'
import { AYLAR, DURUM_LISTESI, GMY_LISTESI, KPI_KARTLARI } from '../../data/constants'
import { getUniqueYears } from '../../utils/helpers'
import AylikPlanChart from './AylikPlanChart'
import EgitimDurumChart from './EgitimDurumChart'
import GMYChart from './GMYChart'
import StatCard from './StatCard'
import TopEgitimlerChart from './TopEgitimlerChart'

export default function Dashboard({ planlar, talepler }) {
  const years = getUniqueYears(planlar)
  const [selectedYear, setSelectedYear] = useState(years[0])
  const [selectedGmy, setSelectedGmy] = useState('Tümü')

  const filteredPlans = planlar.filter(
    (plan) => plan.egitimYili === Number(selectedYear) && (selectedGmy === 'Tümü' || plan.gmy === selectedGmy),
  )

  const filteredTalepler = talepler.filter((talep) => {
    return selectedGmy === 'Tümü' || talep.gmy === selectedGmy
  })

  const stats = {
    toplam: filteredPlans.length,
    yillikPlan: filteredPlans.filter((plan) => plan.egitimTuru === 'Yıllık Plan').length,
    planDisi: filteredPlans.filter((plan) => plan.egitimTuru === 'Yıllık Plan Dışı').length,
    calisan: new Set(filteredPlans.map((plan) => plan.calisanSicil)).size,
  }

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

  const gmyData = GMY_LISTESI.map((gmy) => {
    const plansByGmy = filteredPlans.filter((plan) => plan.gmy === gmy)
    return {
      gmy,
      count: plansByGmy.length,
      calisan: new Set(plansByGmy.map((plan) => plan.calisanSicil)).size,
      egitimCesidi: new Set(plansByGmy.map((plan) => plan.egitimAdi)).size,
    }
  }).filter((item) => item.count > 0)

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
          <h2>Kurumsal eğitim planının durumunu tek ekrandan takip edin</h2>
          <p>
            Yıllık plan ile anlık ihtiyaçları birlikte izleyin, GMY bazında yoğunluğu görün ve en
            çok talep edilen eğitimleri doğrudan takip edin.
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
            <select value={selectedGmy} onChange={(event) => setSelectedGmy(event.target.value)}>
              <option value="Tümü">Tümü</option>
              {GMY_LISTESI.map((gmy) => (
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

      <section className="dashboard-grid dashboard-grid--top">
        <AylikPlanChart data={monthlyData} />
        <EgitimDurumChart data={statusData} />
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <GMYChart data={gmyData} />
        <TopEgitimlerChart data={topEgitimler} />
      </section>
    </div>
  )
}