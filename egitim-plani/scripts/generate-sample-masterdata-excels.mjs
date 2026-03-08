import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.join(projectRoot, 'public')

function writeWorkbook(fileName, rows, sheetName) {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, path.join(publicDir, fileName))
}

writeWorkbook(
  'ornek-talep-aktarim.xlsx',
  [
    {
      'Yönetici Adı': 'Zeynep Arslan',
      'Yönetici E-posta': 'zeynep.arslan@firma.com',
      GMY: 'Operasyon',
      Lokasyon: 'Gebze',
      'Çalışan Adı': 'Murat Kaya',
      'Çalışan Sicil No': '100245',
      'Çalışan Kullanıcı Kodu': 'mkaya',
      Notlar: 'Yıllık gelişim planı kapsamında öncelikli eğitimler.',
      'Eğitim 1 Kodu': 'OPR-101',
      'Eğitim 1 Adı': 'Problem Çözme Teknikleri',
      'Eğitim 1 Kategori': 'Operasyonel Mükemmellik',
      'Eğitim 2 Kodu': 'OPR-204',
      'Eğitim 2 Adı': 'Kök Neden Analizi',
      'Eğitim 2 Kategori': 'Kalite',
    },
    {
      'Yönetici Adı': 'Ece Şahin',
      'Yönetici E-posta': 'ece.sahin@firma.com',
      GMY: 'Bilgi Teknolojileri',
      Lokasyon: 'Maslak',
      'Çalışan Adı': 'Can Tunç',
      'Çalışan Sicil No': '100312',
      'Çalışan Kullanıcı Kodu': 'ctunc',
      Notlar: 'Power BI ve veri modelleme odağıyla talep edildi.',
      'Eğitim 1 Kodu': 'BT-330',
      'Eğitim 1 Adı': 'Power BI ile Yönetim Raporlama',
      'Eğitim 1 Kategori': 'Veri ve Raporlama',
      'Eğitim 2 Kodu': 'BT-412',
      'Eğitim 2 Adı': 'SQL Performans Optimizasyonu',
      'Eğitim 2 Kategori': 'Yazılım',
    },
    {
      'Yönetici Adı': 'Burak Öztürk',
      'Yönetici E-posta': 'burak.ozturk@firma.com',
      GMY: 'İnsan Kaynakları',
      Lokasyon: 'Ankara',
      'Çalışan Adı': 'Selin Acar',
      'Çalışan Sicil No': '100487',
      'Çalışan Kullanıcı Kodu': 'sacar',
      Notlar: 'Yönetici yedeği programı için seçildi.',
      'Eğitim 1 Kodu': 'IK-118',
      'Eğitim 1 Adı': 'Koçvari Liderlik',
      'Eğitim 1 Kategori': 'Liderlik',
      'Eğitim 2 Kodu': 'IK-210',
      'Eğitim 2 Adı': 'Etkili Geri Bildirim',
      'Eğitim 2 Kategori': 'İletişim',
    },
  ],
  'Talepler',
)

writeWorkbook(
  'ornek-kurum-listesi.xlsx',
  [
    {
      'Kurum Adı': 'Akademi Plus',
      Email: 'iletisim@akademiplus.com',
      'Hizmet Alanı': 'Liderlik ve yönetsel gelişim',
    },
    {
      'Kurum Adı': 'VeriLab Eğitim',
      Email: 'destek@verilab.com',
      'Hizmet Alanı': 'Veri analitiği ve raporlama',
    },
    {
      'Kurum Adı': 'Lean Factory Institute',
      Email: 'egitim@leanfactory.io',
      'Hizmet Alanı': 'Süreç iyileştirme ve yalın üretim',
    },
  ],
  'Kurumlar',
)

writeWorkbook(
  'ornek-ic-egitmen-listesi.xlsx',
  [
    {
      'Ad Soyad': 'Ayşe Demir',
      Birim: 'İK Akademi',
      Email: 'ayse.demir@firma.com',
      Uzmanlik: 'Liderlik ve geri bildirim',
    },
    {
      'Ad Soyad': 'Mehmet Yılmaz',
      Birim: 'BT Akademi',
      Email: 'mehmet.yilmaz@firma.com',
      Uzmanlik: 'Veri analitiği ve Power BI',
    },
    {
      'Ad Soyad': 'Selin Kaya',
      Birim: 'Operasyonel Mükemmellik',
      Email: 'selin.kaya@firma.com',
      Uzmanlik: 'Süreç yönetimi ve problem çözme',
    },
  ],
  'IcEgitmenler',
)