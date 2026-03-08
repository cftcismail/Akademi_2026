import process from 'node:process'
import cors from 'cors'
import express from 'express'
import { checkDatabaseHealth, initializeStateStore, readAppState, writeAppState } from './stateRepository.js'
import { sanitizeAppState } from './defaultAppState.js'

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(cors())
app.use(express.json({ limit: '5mb' }))

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