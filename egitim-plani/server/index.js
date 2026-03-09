import process from 'node:process'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { mapExcelRowsToTalepler } from './talepImport.js'
import { checkDatabaseHealth, importTalepler, initializeStateStore, readAppState, writeAppState } from './stateRepository.js'
import { sanitizeAppState } from './defaultAppState.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.IMPORT_MAX_FILE_SIZE || 30 * 1024 * 1024),
  },
})

app.use(cors())
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '50mb' }))

app.get('/health', async (_request, response) => {
  try {
    await checkDatabaseHealth()
    response.json({ ok: true })
  } catch (error) {
    response.status(503).json({ ok: false, error: error.message })
  }
})

app.get('/api/health', async (_request, response) => {
  try {
    await checkDatabaseHealth()
    response.json({ ok: true })
  } catch (error) {
    response.status(503).json({ ok: false, error: error.message })
  }
})

app.get('/api/state', async (_request, response, next) => {
  try {
    const data = await readAppState()
    response.json({ data })
  } catch (error) {
    next(error)
  }
})

app.put('/api/state', async (request, response, next) => {
  try {
    const data = sanitizeAppState(request.body?.data)
    const savedState = await writeAppState(data)
    response.json({ data: savedState })
  } catch (error) {
    next(error)
  }
})

app.post('/api/import/talepler', upload.single('file'), async (request, response, next) => {
  try {
    console.log('[import:talepler] request received')
    const buffer = request.file?.buffer
    if (!buffer?.length) {
      response.status(400).json({ error: 'Yüklenecek Excel dosyası bulunamadı.' })
      return
    }

    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]

    if (!sheetName) {
      response.status(400).json({ error: 'Excel dosyasında okunacak sayfa bulunamadı.' })
      return
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: '',
      raw: true,
    })
    console.log(`[import:talepler] parsed rows=${rows.length}`)

    const talepYili = Number(request.body?.talepYili || new Date().getFullYear())
    const maxIssues = Number(request.body?.maxIssues || 250)
    const payloads = mapExcelRowsToTalepler(rows).map((payload) => ({
      ...payload,
      talepYili,
    }))

    const result = await importTalepler(payloads, {
      talepYili,
      maxIssues,
    })

    console.log(
      `[import:talepler] completed imported=${result.importedCount} issues=${result.totalIssueCount} year=${talepYili}`,
    )

    response.json({
      ...result,
      processedRowCount: rows.length,
    })
  } catch (error) {
    next(error)
  }
})

app.use((error, _request, response, next) => {
  void next
  console.error(error)
  response.status(500).json({
    error: 'Sunucu hatası oluştu.',
    detail: error.message,
  })
})

async function startServer() {
  await initializeStateStore()

  app.listen(port, () => {
    console.log(`API server listening on http://0.0.0.0:${port}`)
  })
}

startServer().catch((error) => {
  console.error('API server failed to start', error)
  process.exit(1)
})