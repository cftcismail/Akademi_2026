import { useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { addDays, parseISO } from 'date-fns'
import { Download } from 'lucide-react'
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
import {
  downloadCsv,
  formatCurrency,
  formatDate,
  formatEgitimLabel,
  getLokasyonLabel,
  getPlanCostInTry,
  getPlanOriginalCostShare,
  getPlanProviderLabel,
  getPlanProviderTypeLabel,
  getTalepKaynagiLabel,
  summarizeDemandCoverage,
  getUniqueYears,
} from '../../utils/helpers'
import Card from '../ui/Card'
import { downloadElementAsPdf } from '../../utils/pdfExport'

function formatPercent(value) {
  return `%${Math.round(value || 0)}`
}

export default function Raporlar({ planlar, talepler, gmyList, kurBilgileri }) {
  const years = getUniqueYears(planlar, talepler)
  const [selectedYear, setSelectedYear] = useState(years[0] || new Date().getFullYear())
  const [selectedGmy, setSelectedGmy] = useState('Tümü')
  const [selectedLocation, setSelectedLocation] = useState('Tümü')
  const [trainingFilter, setTrainingFilter] = useState('')
  const [coverageStatus, setCoverageStatus] = useState('Tümü')
  const reportRef = useRef(null)
  const activeYear = years.includes(selectedYear) ? selectedYear : years[0] || new Date().getFullYear()
  const activeGmy = selectedGmy === 'Tümü' || gmyList.includes(selectedGmy) ? selectedGmy : 'Tümü'
  const locationOptions = [
    'Tümü',
    ...new Set([...talepler.map((talep) => getLokasyonLabel(talep)), ...planlar.map((plan) => getLokasyonLabel(plan))].filter(Boolean)),
  ]
  const activeLocation = selectedLocation === 'Tümü' || locationOptions.includes(selectedLocation) ? selectedLocation : 'Tümü'
  const futureThreshold = addDays(new Date(), 60)

  const currentYearPlans = planlar.filter(
    (plan) =>
      plan.egitimYili === Number(activeYear) &&
      (activeGmy === 'Tümü' || plan.gmy === activeGmy) &&
      (activeLocation === 'Tümü' || getLokasyonLabel(plan) === activeLocation),
  )
  const currentYearRequests = talepler.filter(
    (talep) =>
      Number(talep.talepYili) === Number(activeYear) &&
      (activeGmy === 'Tümü' || talep.gmy === activeGmy) &&
      (activeLocation === 'Tümü' || getLokasyonLabel(talep) === activeLocation),
  )

  const totalPlan = currentYearPlans.length
  const totalBudget = currentYearPlans.reduce((total, plan) => total + getPlanCostInTry(plan, kurBilgileri), 0)
  const completedCount = currentYearPlans.filter((plan) => plan.durum === 'tamamlandı').length
  const annualRequestCount = currentYearRequests.filter((talep) => getTalepKaynagiLabel(talep) === 'Yıllık Talep').length
  const demandSummary = summarizeDemandCoverage(currentYearRequests, currentYearPlans)
  const normalizedTrainingFilter = trainingFilter.trim().toLocaleLowerCase('tr-TR')
  const filteredCoverageRows = demandSummary.annualCoverageRows.filter((item) => {
    const matchesTraining =
      !normalizedTrainingFilter ||
      [item.egitimAdi, item.egitimKodu, item.kategori].some((value) => `${value || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedTrainingFilter))
    const matchesStatus =
      coverageStatus === 'Tümü' ||
      (coverageStatus === 'Planlananlar' && item.plan > 0) ||
      (coverageStatus === 'Planlanmayanlar' && item.plan === 0) ||
      (coverageStatus === 'Kısmi' && item.plan > 0 && item.plan < item.talep) ||
      (coverageStatus === 'Tam Karşılanan' && item.plan >= item.talep)

    return matchesTraining && matchesStatus
  })
  const filteredExternalPlans = demandSummary.externalPlanRows.filter((item) =>
    !normalizedTrainingFilter ||
    [item.egitimAdi, item.egitimKodu, item.kategori].some((value) => `${value || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedTrainingFilter)),
  )
  const completionRate = totalPlan ? (completedCount / totalPlan) * 100 : 0

  const summaryCards = [
    {
      label: 'Yıllık Talep',
      current: annualRequestCount,
      meta: `${demandSummary.annualDemandCount} eğitim ihtiyacı`,
    },
    {
      label: 'Filtreli Başlık',
      current: filteredCoverageRows.length,
      meta: `${demandSummary.annualRequestTitleCount} başlık içinde`,
    },
    {
      label: 'Planlanan Başlık',
      current: filteredCoverageRows.filter((item) => item.plan > 0).length,
      meta: `${filteredCoverageRows.length ? Math.round((filteredCoverageRows.filter((item) => item.plan > 0).length / filteredCoverageRows.length) * 100) : 0}% planlı`,
    },
    {
      label: 'Planlanmayan Başlık',
      current: filteredCoverageRows.filter((item) => item.plan === 0).length,
      meta: `${filteredExternalPlans.length} yıllık talep dışı başlık ayrıca izlendi`,
    },
  ]

  const monthlyLoad = AYLAR.map((month, index) => ({
    month,
    count: currentYearPlans.filter((plan) => plan.egitimAyi === index + 1).length,
    budget: currentYearPlans
      .filter((plan) => plan.egitimAyi === index + 1)
      .reduce((total, plan) => total + getPlanCostInTry(plan, kurBilgileri), 0),
  }))

  const gmyScorecard = gmyList
    .map((gmy) => {
      const plansByGmy = currentYearPlans.filter((plan) => plan.gmy === gmy)
      const requestsByGmy = currentYearRequests.filter((talep) => talep.gmy === gmy)

      return {
        gmy,
        talep: requestsByGmy.length,
        plan: plansByGmy.length,
        yillikTalep: requestsByGmy.filter((talep) => getTalepKaynagiLabel(talep) === 'Yıllık Talep').length,
        bireyselTalep: requestsByGmy.filter((talep) => getTalepKaynagiLabel(talep) === 'Bireysel Talep').length,
        tamamlanan: plansByGmy.filter((plan) => plan.durum === 'tamamlandı').length,
        butce: plansByGmy.reduce((total, plan) => total + getPlanCostInTry(plan, kurBilgileri), 0),
      }
    })
    .filter((item) => item.talep || item.plan)

  const demandCoverage = filteredCoverageRows.slice(0, 10)
  const externalPlans = filteredExternalPlans.slice(0, 10)

  const upcomingPlans = currentYearPlans
    .filter((plan) => plan.egitimTarihi && parseISO(plan.egitimTarihi) <= futureThreshold)
    .sort((left, right) => left.egitimTarihi.localeCompare(right.egitimTarihi))
    .slice(0, 8)

  const trainerScorecard = Object.values(
    currentYearPlans.reduce((accumulator, plan) => {
      const key = getPlanProviderLabel(plan)

      if (!accumulator[key]) {
        accumulator[key] = {
          saglayici: key,
          plan: 0,
          calisan: new Set(),
          butce: 0,
        }
      }

      accumulator[key].plan += 1
      accumulator[key].calisan.add(plan.calisanSicil)
      accumulator[key].butce += getPlanCostInTry(plan, kurBilgileri)
      return accumulator
    }, {}),
  )
    .map((item) => ({ ...item, calisan: item.calisan.size }))
    .sort((left, right) => right.plan - left.plan || right.butce - left.butce)
    .slice(0, 10)

  const categoryBudget = Object.values(
    currentYearPlans.reduce((accumulator, plan) => {
      if (!accumulator[plan.kategori]) {
        accumulator[plan.kategori] = {
          kategori: plan.kategori,
          plan: 0,
          butce: 0,
        }
      }

      accumulator[plan.kategori].plan += 1
      accumulator[plan.kategori].butce += getPlanCostInTry(plan, kurBilgileri)
      return accumulator
    }, {}),
  ).sort((left, right) => right.butce - left.butce)

  const currencyMix = Object.values(
    currentYearPlans.reduce((accumulator, plan) => {
      const currency = `${plan.maliyetParaBirimi || 'TRY'}`.trim().toUpperCase()

      if (!accumulator[currency]) {
        accumulator[currency] = {
          paraBirimi: currency,
          plan: 0,
          toplam: 0,
          toplamTl: 0,
        }
      }

      accumulator[currency].plan += 1
      accumulator[currency].toplam += getPlanOriginalCostShare(plan)
      accumulator[currency].toplamTl += getPlanCostInTry(plan, kurBilgileri)
      return accumulator
    }, {}),
  ).sort((left, right) => right.toplamTl - left.toplamTl)

  const exportPlans = currentYearPlans.filter(
    (plan) =>
      !normalizedTrainingFilter ||
      [plan.egitimAdi, plan.egitimKodu, plan.kategori].some((value) => `${value || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedTrainingFilter)),
  )

  function handleExport() {
    downloadCsv(
      `egitim-plani-${activeYear}.csv`,
      exportPlans.map((plan) => ({
        'Talep Yılı': plan.egitimYili,
        'Çalışan Adı': plan.calisanAdi,
        Sicil: plan.calisanSicil,
        'Kullanıcı Kodu': plan.calisanKullaniciKodu,
        Lokasyon: plan.calisanLokasyon || '-',
        GMY: plan.gmy,
        'Eğitim Kodu': plan.egitimKodu,
        Eğitim: plan.egitimAdi,
        Kategori: plan.kategori,
        'Eğitim Türü': plan.egitimTuru,
        'Sağlayıcı Türü': getPlanProviderTypeLabel(plan),
        Kurum: plan.kurum,
        'İç Eğitmen': plan.egitimci,
        'Planlanma Tarihi': plan.planlanmaTarihi,
        'Eğitim Tarihi': plan.egitimTarihi,
        Süre: plan.sure,
        Sağlayıcı: getPlanProviderLabel(plan),
        Durum: plan.durum,
        'Para Birimi': plan.maliyetParaBirimi || 'TRY',
        Kur: plan.dovizKuru || 1,
        'Toplam Bütçe': plan.toplamMaliyet ?? plan.maliyet,
        'Bütçe Paylaşım Adedi': plan.butcePaylasimAdedi || 1,
        'Dağıtılmış Bütçe': getPlanOriginalCostShare(plan),
        'TL Maliyet': getPlanCostInTry(plan, kurBilgileri),
      })),
    )
  }

  async function handleDownloadPdf() {
    try {
      await downloadElementAsPdf(reportRef.current, `raporlar-${activeYear}.pdf`)
      toast.success('Rapor ekranı PDF olarak indirildi.')
    } catch (error) {
      toast.error(error.message || 'Rapor PDF olarak indirilemedi.')
    }
  }

  return (
    <div ref={reportRef} className="page-stack">
      <section className="page-toolbar">
        <Card className="surface-card--accent">
          <span className="eyebrow">Yönetim Raporları</span>
          <h2>Seçili yılın eğitim raporları</h2>
          <p>Talep, plan, bütçe ve GMY performansını seçtiğiniz yıl için izleyin. Başka yılların verisi bu rapora karışmaz.</p>
        </Card>
        <div className="toolbar-actions">
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
          <label>
            <span>Lokasyon</span>
            <select value={activeLocation} onChange={(event) => setSelectedLocation(event.target.value)}>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>
          <button className="button" onClick={handleExport}>
            Excel'e Aktar
          </button>
          <button className="button button--secondary" onClick={handleDownloadPdf}>
            <Download size={16} />
            PDF İndir
          </button>
        </div>
      </section>

      <section className="filter-panel">
        <label>
          <span>Eğitim Adı / Kodu</span>
          <input
            type="search"
            value={trainingFilter}
            onChange={(event) => setTrainingFilter(event.target.value)}
            placeholder="Eğitim adı veya kodu ile filtrele"
          />
        </label>
        <label>
          <span>Planlama Durumu</span>
          <select value={coverageStatus} onChange={(event) => setCoverageStatus(event.target.value)}>
            <option value="Tümü">Tümü</option>
            <option value="Planlananlar">Planlananlar</option>
            <option value="Planlanmayanlar">Planlanmayanlar</option>
            <option value="Kısmi">Kısmi</option>
            <option value="Tam Karşılanan">Tam Karşılanan</option>
          </select>
        </label>
      </section>

      <section className="report-highlight-grid">
        {summaryCards.map((item) => (
          <Card key={item.label} className="comparison-card">
            <span>{item.label}</span>
            <strong>{item.current}</strong>
            <small>{item.meta}</small>
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
              <h3>Sağlayıcı Skor Kartı</h3>
              <p>İç eğitmen ve dış kurum bazında plan adedi, çalışan etkisi ve TL bütçe yükü</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sağlayıcı</th>
                  <th>Plan</th>
                  <th>Çalışan</th>
                  <th>TL Bütçe</th>
                </tr>
              </thead>
              <tbody>
                {trainerScorecard.map((item) => (
                  <tr key={item.saglayici}>
                    <td>{item.saglayici}</td>
                    <td>{item.plan}</td>
                    <td>{item.calisan}</td>
                    <td>{formatCurrency(item.butce)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h3>Kategori Bazlı TL Bütçe</h3>
              <p>Hangi kategori daha yüksek bütçe baskısı yaratıyor görün</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th>Plan</th>
                  <th>TL Bütçe</th>
                </tr>
              </thead>
              <tbody>
                {categoryBudget.map((item) => (
                  <tr key={item.kategori}>
                    <td>{item.kategori}</td>
                    <td>{item.plan}</td>
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
                  <th>Yıllık</th>
                  <th>Bireysel</th>
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
                    <td>{item.yillikTalep}</td>
                    <td>{item.bireyselTalep}</td>
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
              <p>Yıllık talep başlıklarında hangi eğitimlerin ne kadarının planlandığını görün</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Eğitim</th>
                  <th>Kategori</th>
                  <th>Yıllık Talep</th>
                  <th>Karşılanan</th>
                  <th>Karşılama</th>
                  <th>Açık</th>
                </tr>
              </thead>
              <tbody>
                {demandCoverage.map((item) => (
                  <tr key={`${item.egitimKodu || ''}-${item.egitimAdi}`}>
                    <td>{formatEgitimLabel(item)}</td>
                    <td>{item.kategori}</td>
                    <td>{item.talep}</td>
                    <td>{item.plan}</td>
                    <td>{formatPercent(item.coverageRate)}</td>
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
              <h3>Yıllık Talep Dışı Planlar</h3>
              <p>Yıllık talep havuzunda olmayan ama ayrıca planlanan eğitim başlıkları</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Eğitim</th>
                  <th>Kategori</th>
                  <th>Plan</th>
                </tr>
              </thead>
              <tbody>
                {externalPlans.length ? (
                  externalPlans.map((item) => (
                    <tr key={`${item.egitimKodu || ''}-${item.egitimAdi}`}>
                      <td>{formatEgitimLabel(item)}</td>
                      <td>{item.kategori}</td>
                      <td>{item.plan}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>Seçili yıl için yıllık talep dışı plan bulunmuyor.</td>
                  </tr>
                )}
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
                    <strong>{formatEgitimLabel(plan)}</strong>
                    <small>{`${plan.calisanAdi} • ${plan.gmy}`}</small>
                  </div>
                  <div className="insight-list-item__meta">
                    <strong>{formatDate(plan.egitimTarihi)}</strong>
                    <small>{`${getPlanProviderLabel(plan)} • ${formatCurrency(getPlanCostInTry(plan, kurBilgileri))}`}</small>
                  </div>
                </div>
              ))
            ) : (
              <p>Önümüzdeki 60 gün içinde planlı eğitim görünmüyor.</p>
            )}
          </div>
        </Card>

        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h3>Para Birimi Özeti</h3>
              <p>Orijinal para birimleri TL bazında normalize edilir</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Para Birimi</th>
                  <th>Plan</th>
                  <th>Orijinal Toplam</th>
                  <th>TL Karşılığı</th>
                </tr>
              </thead>
              <tbody>
                {currencyMix.map((item) => (
                  <tr key={item.paraBirimi}>
                    <td>{item.paraBirimi}</td>
                    <td>{item.plan}</td>
                    <td>{formatCurrency(item.toplam, item.paraBirimi)}</td>
                    <td>{formatCurrency(item.toplamTl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  )
}