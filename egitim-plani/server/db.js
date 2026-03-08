import process from 'node:process'
import pg from 'pg'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/egitim_plani'
const useSsl = `${process.env.DATABASE_SSL || 'false'}`.toLowerCase() === 'true'

export const pool = new Pool({
  connectionString,
  ssl: useSsl
    ? {
        rejectUnauthorized: false,
      }
    : false,
})