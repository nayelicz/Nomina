/**
 * Lectura y validación del CSV de nómina antes de enviarlo al dispersor Alebrije.
 * Formato esperado (ver dispersor-nomina-alebrije/docs/CONEXION_NOMILLAR.md):
 *   phone,employee_id,amount,date_of_birth,stellar_address
 * Solo `amount` es obligatoria.
 */

export interface PayrollRow {
  line: number
  values: Record<string, string>
  amount: number
}

export interface PayrollAnalysis {
  header: string[]
  validRows: PayrollRow[]
  invalidRows: { line: number; reason: string }[]
  total: number
  /** CSV con solo las filas válidas, listo para POST /api/dispersar */
  csv: string
}

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/

function splitLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim().replace(/^"(.*)"$/, "$1"))
}

export function analyzePayrollCsv(text: string): PayrollAnalysis {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) {
    throw new Error("El archivo está vacío.")
  }

  const header = splitLine(lines[0]).map((h) => h.toLowerCase())
  if (!header.includes("amount")) {
    throw new Error('El CSV debe tener una columna "amount".')
  }

  const validRows: PayrollRow[] = []
  const invalidRows: { line: number; reason: string }[] = []

  lines.slice(1).forEach((raw, i) => {
    const lineNumber = i + 2
    const cells = splitLine(raw)
    const values: Record<string, string> = {}
    header.forEach((h, idx) => {
      values[h] = cells[idx] ?? ""
    })

    const amount = Number(values.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      invalidRows.push({ line: lineNumber, reason: "Monto inválido" })
      return
    }
    if (values.stellar_address && !STELLAR_ADDRESS.test(values.stellar_address)) {
      invalidRows.push({ line: lineNumber, reason: "Dirección Stellar inválida" })
      return
    }
    validRows.push({ line: lineNumber, values, amount })
  })

  const total = validRows.reduce((sum, r) => sum + r.amount, 0)
  const csv = [header.join(","), ...validRows.map((r) => header.map((h) => r.values[h]).join(","))].join("\n")

  return { header, validRows, invalidRows, total, csv }
}

export interface DispersionResult {
  ok: boolean
  batchId?: string
  commitmentHash?: string
  hash?: string
  txHash?: string
  txExplorerUrl?: string
  total?: number | string
  asset?: string
  count?: number
  error?: string
}
