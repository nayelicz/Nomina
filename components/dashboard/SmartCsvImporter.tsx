"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileText, CheckCircle2, AlertCircle, X, ShieldAlert, Download } from "lucide-react"
import { analyzePayrollCsv, type PayrollAnalysis } from "@/lib/payroll-csv"

interface SmartCsvImporterProps {
  /** Recibe el CSV validado; debe lanzar error si la dispersión falla. */
  onDisperse: (csv: string) => Promise<void>
  isDispersing: boolean
  escrowReady: boolean
}

const money = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function SmartCsvImporter({ onDisperse, isDispersing, escrowReady }: SmartCsvImporterProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<"upload" | "analyzing" | "preflight">("upload")
  const [analysis, setAnalysis] = useState<PayrollAnalysis | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
    e.target.value = ""
  }

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)
    setParseError(null)
    setAnalysis(null)
    setStep("analyzing")

    try {
      if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
        throw new Error("Por ahora solo se aceptan archivos .csv. Exporta tu Excel como CSV.")
      }
      const text = await selectedFile.text()
      const result = analyzePayrollCsv(text)
      if (result.validRows.length === 0) {
        throw new Error("No hay filas válidas para dispersar.")
      }
      setAnalysis(result)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err))
    }
    setStep("preflight")
  }

  const reset = () => {
    setFile(null)
    setAnalysis(null)
    setParseError(null)
    setStep("upload")
  }

  const canDisperse = !!analysis && !isDispersing && escrowReady

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/20"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleChange} />
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-1">Cargar Nómina o Pagos</h3>
            <p className="text-sm text-muted-foreground mb-4">Arrastra tu archivo CSV aquí o haz clic para buscar.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={() => inputRef.current?.click()}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 border border-border"
              >
                Seleccionar Archivo
              </button>
              <a
                href="/dispersion-ejemplo.csv"
                download
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
              >
                <Download className="w-4 h-4" /> CSV de ejemplo
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-4 font-mono">
              phone, employee_id, amount, date_of_birth, stellar_address
            </p>
          </motion.div>
        )}

        {step === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="border border-border rounded-xl p-8 text-center bg-card"
          >
            <div className="mx-auto w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-4 relative">
              <div className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <FileText className="w-5 h-5 text-accent animate-pulse" />
            </div>
            <h3 className="text-lg font-medium mb-2">Analizando archivo...</h3>
            <p className="text-sm text-muted-foreground">Validando columnas, montos y direcciones Stellar.</p>
          </motion.div>
        )}

        {step === "preflight" && (
          <motion.div
            key="preflight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-border rounded-xl bg-card overflow-hidden"
          >
            <div className="bg-muted/30 p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm font-medium">{file?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {parseError ? "No se pudo procesar" : "Análisis de integridad completo"}
                  </div>
                </div>
              </div>
              <button onClick={reset} className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {parseError && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{parseError}</p>
                </div>
              )}

              {analysis && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                      <div className="text-2xl font-bold text-foreground">{analysis.validRows.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">Destinatarios válidos</div>
                    </div>
                    <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                      <div className="text-2xl font-bold text-primary">${money(analysis.total)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Monto total a dispersar</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                      <p>El lote se registrará en Stellar testnet al confirmar.</p>
                    </div>
                    {analysis.invalidRows.length > 0 && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg text-sm text-yellow-600 dark:text-yellow-500">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <p>
                            {analysis.invalidRows.length} registro(s) omitido(s):
                          </p>
                          <ul className="mt-1 text-xs list-disc pl-4">
                            {analysis.invalidRows.slice(0, 5).map((r) => (
                              <li key={r.line}>
                                Línea {r.line}: {r.reason}
                              </li>
                            ))}
                            {analysis.invalidRows.length > 5 && <li>…y {analysis.invalidRows.length - 5} más</li>}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <button
                onClick={async () => {
                  if (!analysis) return
                  try {
                    await onDisperse(analysis.csv)
                    reset()
                  } catch {
                    // El error ya se muestra en el toast; se conserva el archivo para reintentar.
                  }
                }}
                disabled={!canDisperse}
                className={`w-full py-3 mt-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                  !canDisperse
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                }`}
              >
                {isDispersing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Registrando en Stellar...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    Confirmar y Dispersar
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
