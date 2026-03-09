import { pool } from './db.js'
import { APP_STATE_KEYS, cloneDefaultAppState, sanitizeAppState } from './defaultAppState.js'

const CREATE_TABLE_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS gmy_list (
      name TEXT PRIMARY KEY,
      position INTEGER NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS training_categories (
      name TEXT PRIMARY KEY,
      position INTEGER NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS exchange_rates (
      currency TEXT PRIMARY KEY,
      rate NUMERIC(14, 4) NOT NULL,
      position INTEGER NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      ad TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL DEFAULT '',
      uzmanlik TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS trainers (
      id TEXT PRIMARY KEY,
      ad TEXT NOT NULL UNIQUE,
      birim TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      uzmanlik TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS catalog (
      id TEXT PRIMARY KEY,
      kod TEXT NOT NULL DEFAULT '',
      ad TEXT NOT NULL,
      kategori TEXT NOT NULL DEFAULT '',
      sure TEXT NOT NULL DEFAULT '',
      aciklama TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      talep_yili INTEGER NOT NULL,
      talep_kaynagi TEXT NOT NULL DEFAULT 'Yıllık Talep',
      yonetici_adi TEXT NOT NULL DEFAULT '',
      yonetici_email TEXT NOT NULL DEFAULT '',
      gmy TEXT NOT NULL DEFAULT '',
      calisan_lokasyon TEXT NOT NULL DEFAULT '',
      calisan_adi TEXT NOT NULL DEFAULT '',
      calisan_sicil TEXT NOT NULL DEFAULT '',
      calisan_kullanici_kodu TEXT NOT NULL DEFAULT '',
      notlar TEXT NOT NULL DEFAULT '',
      durum TEXT NOT NULL DEFAULT 'beklemede',
      position INTEGER NOT NULL
    )
  `,
  `
    ALTER TABLE requests
    ADD COLUMN IF NOT EXISTS talep_kaynagi TEXT NOT NULL DEFAULT 'Yıllık Talep'
  `,
  `
    ALTER TABLE requests
    ADD COLUMN IF NOT EXISTS calisan_lokasyon TEXT NOT NULL DEFAULT ''
  `,
  `
    CREATE TABLE IF NOT EXISTS request_trainings (
      egitim_id TEXT PRIMARY KEY,
      talep_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      egitim_kodu TEXT NOT NULL DEFAULT '',
      egitim_adi TEXT NOT NULL,
      kategori TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      talep_id TEXT,
      calisan_adi TEXT NOT NULL DEFAULT '',
      calisan_sicil TEXT NOT NULL DEFAULT '',
      calisan_kullanici_kodu TEXT NOT NULL DEFAULT '',
      calisan_lokasyon TEXT NOT NULL DEFAULT '',
      gmy TEXT NOT NULL DEFAULT '',
      egitim_kodu TEXT NOT NULL DEFAULT '',
      egitim_adi TEXT NOT NULL DEFAULT '',
      kategori TEXT NOT NULL DEFAULT '',
      egitim_turu TEXT NOT NULL DEFAULT '',
      planlanma_tarihi TEXT NOT NULL DEFAULT '',
      egitim_tarihi TEXT NOT NULL DEFAULT '',
      egitim_ayi INTEGER NOT NULL DEFAULT 0,
      egitim_yili INTEGER NOT NULL DEFAULT 0,
      sure TEXT NOT NULL DEFAULT '',
      ic_egitim BOOLEAN NOT NULL DEFAULT FALSE,
      egitimci TEXT NOT NULL DEFAULT '',
      kurum TEXT NOT NULL DEFAULT '',
      maliyet NUMERIC(14, 2) NOT NULL DEFAULT 0,
      toplam_maliyet NUMERIC(14, 2) NOT NULL DEFAULT 0,
      butce_paylasim_adedi INTEGER NOT NULL DEFAULT 1,
      plan_grubu_id TEXT NOT NULL DEFAULT '',
      maliyet_para_birimi TEXT NOT NULL DEFAULT 'TRY',
      doviz_kuru NUMERIC(14, 4) NOT NULL DEFAULT 1,
      durum TEXT NOT NULL DEFAULT 'planlandı',
      notlar TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL
    )
  `,
  `
    ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS calisan_lokasyon TEXT NOT NULL DEFAULT ''
  `,
  `
    ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS toplam_maliyet NUMERIC(14, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS butce_paylasim_adedi INTEGER NOT NULL DEFAULT 1
  `,
  `
    ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS plan_grubu_id TEXT NOT NULL DEFAULT ''
  `,
]

async function legacyJsonStateExists(client) {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'app_state'
      ) AS exists
    `,
  )

  return Boolean(result.rows[0]?.exists)
}

async function readLegacyJsonState(client) {
  if (!(await legacyJsonStateExists(client))) {
    return null
  }

  const defaults = cloneDefaultAppState()
  const { rows } = await client.query('SELECT key, value FROM app_state')

  rows.forEach((row) => {
    if (APP_STATE_KEYS.includes(row.key)) {
      defaults[row.key] = row.value
    }
  })

  return sanitizeAppState(defaults)
}

async function hasRelationalState(client) {
  const tables = [
    'gmy_list',
    'training_categories',
    'exchange_rates',
    'institutions',
    'trainers',
    'catalog',
    'requests',
    'request_trainings',
    'plans',
  ]

  for (const tableName of tables) {
    const result = await client.query(`SELECT EXISTS (SELECT 1 FROM ${tableName} LIMIT 1) AS exists`)

    if (result.rows[0]?.exists) {
      return true
    }
  }

  return false
}

async function clearRelationalState(client) {
  await client.query('DELETE FROM plans')
  await client.query('DELETE FROM request_trainings')
  await client.query('DELETE FROM requests')
  await client.query('DELETE FROM catalog')
  await client.query('DELETE FROM institutions')
  await client.query('DELETE FROM trainers')
  await client.query('DELETE FROM exchange_rates')
  await client.query('DELETE FROM training_categories')
  await client.query('DELETE FROM gmy_list')
}

const BATCH_SIZE = 500

function buildBatchInsert(baseQuery, rows, columnsPerRow) {
  if (!rows.length) {
    return null
  }
  const values = []
  const placeholders = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const offset = i * columnsPerRow
    const rowPlaceholders = []
    for (let col = 0; col < columnsPerRow; col++) {
      rowPlaceholders.push(`$${offset + col + 1}`)
      values.push(row[col])
    }
    placeholders.push(`(${rowPlaceholders.join(', ')})`)
  }
  return { text: `${baseQuery} VALUES ${placeholders.join(', ')}`, values }
}

async function batchInsert(client, baseQuery, allRows, columnsPerRow) {
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE)
    const query = buildBatchInsert(baseQuery, batch, columnsPerRow)
    if (query) {
      await client.query(query.text, query.values)
    }
  }
}

async function persistRelationalState(client, nextState) {
  const sanitized = sanitizeAppState(nextState)

  await clearRelationalState(client)

  // gmy_list
  await batchInsert(
    client,
    'INSERT INTO gmy_list (name, position)',
    sanitized.gmyList.map((name, index) => [name, index]),
    2,
  )

  // training_categories
  await batchInsert(
    client,
    'INSERT INTO training_categories (name, position)',
    sanitized.egitimKategorileri.map((name, index) => [name, index]),
    2,
  )

  // exchange_rates
  await batchInsert(
    client,
    'INSERT INTO exchange_rates (currency, rate, position)',
    Object.entries(sanitized.kurBilgileri).map(([currency, rate], index) => [currency, Number(rate || 0), index]),
    3,
  )

  // institutions
  await batchInsert(
    client,
    'INSERT INTO institutions (id, ad, email, uzmanlik, position)',
    sanitized.kurumListesi.map((inst, index) => [inst.id, inst.ad, inst.email || '', inst.uzmanlik || '', index]),
    5,
  )

  // trainers
  await batchInsert(
    client,
    'INSERT INTO trainers (id, ad, birim, email, uzmanlik, position)',
    sanitized.egitmenListesi.map((t, index) => [t.id, t.ad, t.birim || '', t.email || '', t.uzmanlik || '', index]),
    6,
  )

  // catalog
  await batchInsert(
    client,
    'INSERT INTO catalog (id, kod, ad, kategori, sure, aciklama, position)',
    sanitized.katalog.map((item, index) => [item.id, item.kod || '', item.ad, item.kategori || '', item.sure || '', item.aciklama || '', index]),
    7,
  )

  // requests
  await batchInsert(
    client,
    `INSERT INTO requests (
       id, talep_yili, talep_kaynagi, yonetici_adi, yonetici_email, gmy,
       calisan_lokasyon, calisan_adi, calisan_sicil, calisan_kullanici_kodu,
       notlar, durum, position
     )`,
    sanitized.talepler.map((talep, index) => [
      talep.id,
      Number(talep.talepYili || 0),
      `${talep.talepKaynagi || 'Yıllık Talep'}`.trim() || 'Yıllık Talep',
      talep.yoneticiAdi || '',
      talep.yoneticiEmail || '',
      talep.gmy || '',
      talep.calisanLokasyon || '',
      talep.calisanAdi || '',
      talep.calisanSicil || '',
      talep.calisanKullaniciKodu || '',
      talep.notlar || '',
      talep.durum || 'beklemede',
      index,
    ]),
    13,
  )

  // request_trainings
  const allTrainings = []
  for (const talep of sanitized.talepler) {
    for (const [trainingIndex, egitim] of (talep.egitimler || []).entries()) {
      allTrainings.push([
        egitim.egitimId,
        talep.id,
        egitim.egitimKodu || '',
        egitim.egitimAdi || '',
        egitim.kategori || '',
        trainingIndex,
      ])
    }
  }
  await batchInsert(
    client,
    'INSERT INTO request_trainings (egitim_id, talep_id, egitim_kodu, egitim_adi, kategori, position)',
    allTrainings,
    6,
  )

  // plans
  await batchInsert(
    client,
    `INSERT INTO plans (
       id, talep_id, calisan_adi, calisan_sicil, calisan_kullanici_kodu,
       calisan_lokasyon, gmy, egitim_kodu, egitim_adi, kategori, egitim_turu,
       planlanma_tarihi, egitim_tarihi, egitim_ayi, egitim_yili, sure,
       ic_egitim, egitimci, kurum, maliyet, toplam_maliyet,
       butce_paylasim_adedi, plan_grubu_id, maliyet_para_birimi, doviz_kuru,
       durum, notlar, position
     )`,
    sanitized.planlar.map((plan, index) => [
      plan.id,
      plan.talepId || null,
      plan.calisanAdi || '',
      plan.calisanSicil || '',
      plan.calisanKullaniciKodu || '',
      plan.calisanLokasyon || '',
      plan.gmy || '',
      plan.egitimKodu || '',
      plan.egitimAdi || '',
      plan.kategori || '',
      plan.egitimTuru || '',
      plan.planlanmaTarihi || '',
      plan.egitimTarihi || '',
      Number(plan.egitimAyi || 0),
      Number(plan.egitimYili || 0),
      plan.sure || '',
      Boolean(plan.icEgitim),
      plan.egitimci || '',
      plan.kurum || '',
      Number(plan.maliyet || 0),
      Number((plan.toplamMaliyet ?? plan.maliyet) || 0),
      Math.max(1, Number(plan.butcePaylasimAdedi || 1)),
      plan.planGrubuId || plan.id,
      plan.maliyetParaBirimi || 'TRY',
      Number(plan.dovizKuru || 1),
      plan.durum || 'planlandı',
      plan.notlar || '',
      index,
    ]),
    28,
  )

  return sanitized
}

async function readRelationalState(client) {
  const defaults = cloneDefaultAppState()
  const gmyRows = await client.query('SELECT name FROM gmy_list ORDER BY position ASC')
  const categoryRows = await client.query('SELECT name FROM training_categories ORDER BY position ASC')
  const rateRows = await client.query('SELECT currency, rate FROM exchange_rates ORDER BY position ASC')
  const institutionRows = await client.query('SELECT id, ad, email, uzmanlik FROM institutions ORDER BY position ASC')
  const trainerRows = await client.query('SELECT id, ad, birim, email, uzmanlik FROM trainers ORDER BY position ASC')
  const catalogRows = await client.query('SELECT id, kod, ad, kategori, sure, aciklama FROM catalog ORDER BY position ASC')
  const requestRows = await client.query(
    `SELECT id, talep_yili, yonetici_adi, yonetici_email, gmy, calisan_lokasyon, calisan_adi,
            talep_kaynagi, calisan_sicil, calisan_kullanici_kodu, notlar, durum
     FROM requests ORDER BY position ASC`,
  )
  const requestTrainingRows = await client.query(
    `SELECT egitim_id, talep_id, egitim_kodu, egitim_adi, kategori, position
     FROM request_trainings ORDER BY talep_id ASC, position ASC`,
  )
  const planRows = await client.query(
    `SELECT id, talep_id, calisan_adi, calisan_sicil, calisan_kullanici_kodu, gmy,
            calisan_lokasyon, egitim_kodu, egitim_adi, kategori, egitim_turu, planlanma_tarihi,
            egitim_tarihi, egitim_ayi, egitim_yili, sure, ic_egitim, egitimci,
            kurum, maliyet, toplam_maliyet, butce_paylasim_adedi, plan_grubu_id,
            maliyet_para_birimi, doviz_kuru, durum, notlar
     FROM plans ORDER BY position ASC`,
  )

  defaults.gmyList = gmyRows.rows.map((row) => row.name)
  defaults.egitimKategorileri = categoryRows.rows.map((row) => row.name)

  if (rateRows.rows.length) {
    defaults.kurBilgileri = rateRows.rows.reduce((accumulator, row) => {
      accumulator[row.currency] = Number(row.rate)
      return accumulator
    }, {})
  }

  defaults.kurumListesi = institutionRows.rows.map((row) => ({
    id: row.id,
    ad: row.ad,
    email: row.email,
    uzmanlik: row.uzmanlik,
  }))

  defaults.egitmenListesi = trainerRows.rows.map((row) => ({
    id: row.id,
    ad: row.ad,
    birim: row.birim,
    email: row.email,
    uzmanlik: row.uzmanlik,
  }))

  defaults.katalog = catalogRows.rows.map((row) => ({
    id: row.id,
    kod: row.kod,
    ad: row.ad,
    kategori: row.kategori,
    sure: row.sure,
    aciklama: row.aciklama,
  }))

  const requestTrainingsByTalepId = requestTrainingRows.rows.reduce((accumulator, row) => {
    if (!accumulator[row.talep_id]) {
      accumulator[row.talep_id] = []
    }

    accumulator[row.talep_id].push({
      egitimId: row.egitim_id,
      egitimKodu: row.egitim_kodu,
      egitimAdi: row.egitim_adi,
      kategori: row.kategori,
    })
    return accumulator
  }, {})

  defaults.talepler = requestRows.rows.map((row) => ({
    id: row.id,
    talepYili: Number(row.talep_yili),
    talepKaynagi: row.talep_kaynagi || 'Yıllık Talep',
    yoneticiAdi: row.yonetici_adi,
    yoneticiEmail: row.yonetici_email,
    gmy: row.gmy,
    calisanLokasyon: row.calisan_lokasyon || '',
    calisanAdi: row.calisan_adi,
    calisanSicil: row.calisan_sicil,
    calisanKullaniciKodu: row.calisan_kullanici_kodu,
    egitimler: requestTrainingsByTalepId[row.id] || [],
    notlar: row.notlar,
    durum: row.durum,
  }))

  defaults.planlar = planRows.rows.map((row) => ({
    id: row.id,
    talepId: row.talep_id,
    calisanAdi: row.calisan_adi,
    calisanSicil: row.calisan_sicil,
    calisanKullaniciKodu: row.calisan_kullanici_kodu,
    calisanLokasyon: row.calisan_lokasyon || '',
    gmy: row.gmy,
    egitimKodu: row.egitim_kodu,
    egitimAdi: row.egitim_adi,
    kategori: row.kategori,
    egitimTuru: row.egitim_turu,
    planlanmaTarihi: row.planlanma_tarihi,
    egitimTarihi: row.egitim_tarihi,
    egitimAyi: Number(row.egitim_ayi),
    egitimYili: Number(row.egitim_yili),
    sure: row.sure,
    icEgitim: Boolean(row.ic_egitim),
    egitimci: row.egitimci,
    kurum: row.kurum,
    maliyet: Number(row.maliyet || 0),
    toplamMaliyet: Number(row.toplam_maliyet || row.maliyet || 0),
    butcePaylasimAdedi: Math.max(1, Number(row.butce_paylasim_adedi || 1)),
    planGrubuId: row.plan_grubu_id || row.id,
    maliyetParaBirimi: row.maliyet_para_birimi,
    dovizKuru: Number(row.doviz_kuru || 1),
    durum: row.durum,
    notlar: row.notlar,
  }))

  return sanitizeAppState(defaults)
}

export async function initializeStateStore() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    for (const statement of CREATE_TABLE_STATEMENTS) {
      await client.query(statement)
    }

    if (!(await hasRelationalState(client))) {
      const legacyState = await readLegacyJsonState(client)
      const initialState = legacyState || cloneDefaultAppState()
      await persistRelationalState(client, initialState)
    }

    if (await legacyJsonStateExists(client)) {
      await client.query('DROP TABLE IF EXISTS app_state')
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function readAppState() {
  const client = await pool.connect()

  try {
    return await readRelationalState(client)
  } finally {
    client.release()
  }
}

export async function writeAppState(nextState) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const persistedState = await persistRelationalState(client, nextState)
    await client.query('COMMIT')
    return persistedState
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function checkDatabaseHealth() {
  await pool.query('SELECT 1')
}