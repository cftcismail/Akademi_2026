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