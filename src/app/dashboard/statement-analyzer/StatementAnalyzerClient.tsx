'use client'

import React, { useState, useMemo, useRef } from 'react'
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  Download,
  Database,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  Calendar,
  User,
  Hash,
  Sparkles,
  ArrowUpDown,
  ExternalLink,
  ArrowRight,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { StatementAnalysisResult, AnalyzedTransaction } from '@/lib/statement-parser'

interface AccountOption {
  account_id: string
  account_category: string
  client_name: string
}

interface CompanyOption {
  company_id: string
  name: string
}

interface Props {
  accounts: AccountOption[]
  companies: CompanyOption[]
}

const SAMPLE_STATEMENTS = [
  {
    name: 'Mashreq Bank (2025–2026)',
    fileName: 'Mashreq_Bank_Statement.pdf',
    bank: 'Mashreq Bank (Mashreq NEO)',
    note: '12 pages · 50 transactions',
  },
  {
    name: 'Habib Bank Limited (2025–2026)',
    fileName: 'HBL_Statement_2025_2026.pdf',
    bank: 'Habib Bank Limited (HBL)',
    note: '6 pages · 130 transactions',
  },
  {
    name: 'Habib Bank Limited (2024–2025)',
    fileName: 'HBL_Statement_2024_2025.pdf',
    bank: 'Habib Bank Limited (HBL)',
    note: '4 pages · 60 transactions',
  },
  {
    name: 'easypaisa Bank Limited (2025–2026)',
    fileName: 'Easypaisa_2025_2026.pdf',
    bank: 'easypaisa Bank Limited',
    note: '65 pages · 387 transactions',
  },
  {
    name: 'easypaisa Bank Limited (2026)',
    fileName: 'Easypaisa_Statement.pdf',
    bank: 'easypaisa Bank Limited',
    note: '13 pages · 77 transactions',
  },
  {
    name: 'United Bank Limited (2025–2026)',
    fileName: 'UBL_Statement.pdf',
    bank: 'United Bank Limited (UBL)',
    note: '7 pages · 174 transactions',
  },
  {
    name: 'myABL App Statement (2024–2025)',
    fileName: 'myABL_Statement.pdf',
    bank: 'myABL (Allied Bank Limited)',
    note: '62 pages · 702 transactions',
  },
  {
    name: 'Allied Bank Limited (2025–2026)',
    fileName: 'Allied_Bank_Statement.pdf',
    bank: 'Allied Bank Limited',
    note: '188 pages · 1,159 transactions',
  },
  {
    name: 'The Bank of Punjab (2025–2026)',
    fileName: 'Bank_of_Punjab_2025_2026.pdf',
    bank: 'The Bank of Punjab',
    note: '22 pages · 314 transactions',
  },
  {
    name: 'Askari Bank (2025–2026)',
    fileName: 'Askari_Bank_Statement.pdf',
    bank: 'Askari Bank Limited',
    note: '9 pages · 251 transactions',
  },
  {
    name: 'The Bank of Punjab (2022–2023)',
    fileName: 'Bank_of_Punjab_2022_2023.pdf',
    bank: 'The Bank of Punjab',
    note: '13 pages · 245 transactions',
  },
  {
    name: 'The Bank of Punjab (2024–2025)',
    fileName: 'Bank_of_Punjab_2024_2025.pdf',
    bank: 'The Bank of Punjab',
    note: '17 pages · 308 transactions',
  },
  {
    name: 'The Bank of Punjab (2021–2022)',
    fileName: 'Bank_of_Punjab_2021_2022.pdf',
    bank: 'The Bank of Punjab',
    note: '14 pages · 275 transactions',
  },
]

type SortField = 'date' | 'description' | 'amount' | 'balance' | 'type' | 'incoming' | 'outgoing'
type SortOrder = 'asc' | 'desc'

export default function StatementAnalyzerClient({ accounts, companies }: Props) {
  const [analyzedResults, setAnalyzedResults] = useState<StatementAnalysisResult[]>([])
  const [activeResultIndex, setActiveResultIndex] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL')
  const [purposeFilter, setPurposeFilter] = useState<string>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(50)

  // Import to Database Modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  const activeResult: StatementAnalysisResult | null =
    analyzedResults[activeResultIndex] || null

  // Analyze File (Local or Sample)
  async function handleFileUpload(file: File) {
    setLoading(true)
    setError(null)
    setLoadingMessage(`Extracting & analyzing ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/analyze-statement', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze statement.')
      }

      setAnalyzedResults((prev) => {
        const next = [data, ...prev]
        return next
      })
      setActiveResultIndex(0)
      setCurrentPage(1)
    } catch (err: any) {
      setError(err.message || 'An error occurred while analyzing the statement.')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  async function handleSampleSelect(sampleFileName: string) {
    setLoading(true)
    setError(null)
    setLoadingMessage(`Loading sample ${sampleFileName}...`)

    try {
      const formData = new FormData()
      formData.append('sample', sampleFileName)

      const res = await fetch('/api/analyze-statement', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze sample statement.')
      }

      setAnalyzedResults((prev) => {
        const next = [data, ...prev]
        return next
      })
      setActiveResultIndex(0)
      setCurrentPage(1)
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading sample statement.')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    if (files.length > 0) {
      handleFileUpload(files[0])
    } else {
      setError('Please upload a PDF file.')
    }
  }

  // Filter & Sort Transactions
  const filteredTransactions = useMemo(() => {
    if (!activeResult) return []

    return activeResult.transactions
      .filter((tx) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchDesc = tx.description.toLowerCase().includes(q)
          const matchRef = tx.reference?.toLowerCase().includes(q)
          const matchAmt = tx.amount.toString().includes(q)
          const matchDate = tx.date.includes(q) || tx.rawDate.toLowerCase().includes(q)
          if (!matchDesc && !matchRef && !matchAmt && !matchDate) return false
        }

        // Type
        if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
          return false
        }

        // Purpose
        if (purposeFilter !== 'ALL' && tx.purpose !== purposeFilter) {
          return false
        }

        // Date Range
        if (dateFrom && tx.date < dateFrom) return false
        if (dateTo && tx.date > dateTo) return false

        // Amount Range
        if (minAmount && tx.amount < parseFloat(minAmount)) return false
        if (maxAmount && tx.amount > parseFloat(maxAmount)) return false

        return true
      })
      .sort((a, b) => {
        let valA: any = a[sortField]
        let valB: any = b[sortField]

        if (sortField === 'incoming') {
          valA = a.type === 'CREDIT' ? a.amount : 0
          valB = b.type === 'CREDIT' ? b.amount : 0
        } else if (sortField === 'outgoing') {
          valA = a.type === 'DEBIT' ? a.amount : 0
          valB = b.type === 'DEBIT' ? b.amount : 0
        } else if (sortField === 'date') {
          valA = new Date(a.date).getTime()
          valB = new Date(b.date).getTime()
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
  }, [
    activeResult,
    searchQuery,
    typeFilter,
    purposeFilter,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    sortField,
    sortOrder,
  ])

  // Pagination logic
  const totalFilteredCount = filteredTransactions.length
  const paginatedTransactions = useMemo(() => {
    if (pageSize === -1) return filteredTransactions
    const start = (currentPage - 1) * pageSize
    return filteredTransactions.slice(start, start + pageSize)
  }, [filteredTransactions, currentPage, pageSize])

  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalFilteredCount / pageSize)

  // Filtered totals
  const filteredTotals = useMemo(() => {
    const credits = filteredTransactions
      .filter((t) => t.type === 'CREDIT')
      .reduce((s, t) => s + t.amount, 0)
    const debits = filteredTransactions
      .filter((t) => t.type === 'DEBIT')
      .reduce((s, t) => s + t.amount, 0)
    return {
      credits,
      debits,
      net: credits - debits,
    }
  }, [filteredTransactions])

  // Purpose options available in current statement
  const availablePurposes = useMemo(() => {
    if (!activeResult) return []
    const set = new Set<string>()
    activeResult.transactions.forEach((t) => set.add(t.purpose))
    return Array.from(set).sort()
  }, [activeResult])

  // Export to CSV
  function handleExportCSV() {
    if (!activeResult || filteredTransactions.length === 0) return

    const headers = [
      'Date',
      'Value Date',
      'Description',
      'Reference',
      'Category/Purpose',
      'Type',
      'Debit (PKR)',
      'Credit (PKR)',
      'Amount (PKR)',
      'Balance (PKR)',
    ]

    const rows = filteredTransactions.map((t) => [
      `"${t.date}"`,
      `"${t.valueDate || t.date}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.reference || ''}"`,
      `"${t.purpose}"`,
      `"${t.type}"`,
      t.type === 'DEBIT' ? t.amount.toFixed(2) : '0.00',
      t.type === 'CREDIT' ? t.amount.toFixed(2) : '0.00',
      t.amount.toFixed(2),
      t.balance !== null ? t.balance.toFixed(2) : '',
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `${activeResult.bankDetected.replace(/\s+/g, '_')}_transactions_${activeResult.metadata.periodFrom || 'statement'}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export to JSON
  function handleExportJSON() {
    if (!activeResult) return
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(activeResult, null, 2))
    const link = document.createElement('a')
    link.href = dataStr
    link.setAttribute('download', `${activeResult.fileName.replace(/\.pdf$/i, '')}_analysis.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Import to Supabase Database
  async function handleImportToDatabase() {
    if (!selectedAccountId || !activeResult) return
    setImporting(true)
    setImportSuccess(null)
    setError(null)

    try {
      const supabase = createClient() as any

      // Database purpose enum mapping: 'Pension' | 'Salary' | 'Bonus' | 'Gratuity' | 'Other'
      const validDbPurposes = new Set(['Pension', 'Salary', 'Bonus', 'Gratuity', 'Other'])

      const dbRows = activeResult.transactions.map((tx) => {
        const dbPurpose = validDbPurposes.has(tx.purpose) ? tx.purpose : 'Other'
        return {
          target_account_id: selectedAccountId,
          title: tx.description.slice(0, 255),
          group_title: tx.reference ? `Ref: ${tx.reference}` : tx.purpose,
          transaction_date: tx.date,
          amount: tx.amount,
          transaction_type: tx.type,
          purpose: dbPurpose,
        }
      })

      // Batch insert in chunks of 100
      const chunkSize = 100
      for (let i = 0; i < dbRows.length; i += chunkSize) {
        const chunk = dbRows.slice(i, i + chunkSize)
        const { error: insertErr } = await supabase.from('transactions').insert(chunk)
        if (insertErr) throw insertErr
      }

      setImportSuccess(
        `Successfully imported ${dbRows.length} transactions into the selected account!`
      )
      setTimeout(() => {
        setShowImportModal(false)
        setImportSuccess(null)
      }, 2500)
    } catch (err: any) {
      setError(`Failed to import transactions: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  function getPurposeColor(purpose: string) {
    switch (purpose) {
      case 'Salary':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Bonus':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'Transfer':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Cash Withdrawal':
        return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'POS Purchase':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Bill Payment':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'Fee/Charges':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'Pension':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="h-4 w-4" />
              Automated PDF Parser & Analytics
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Bank Statement Analyzer
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Upload any bank statement PDF (HBL, Askari Bank, Bank of Punjab, UBL, easypaisa, etc.) to
              automatically extract every transaction, verify running balances, analyze cash flows, and export or import data into the ledger.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <Upload className="h-4 w-4" />
              Upload PDF
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0])
                }
              }}
            />
          </div>
        </div>

        {/* Quick Sample Selector */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2.5 font-medium">
            <span>Or try an instant sample statement:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {SAMPLE_STATEMENTS.map((s) => (
              <button
                key={s.fileName}
                disabled={loading}
                onClick={() => handleSampleSelect(s.fileName)}
                className="flex flex-col text-left px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-amber-500/50 transition text-xs group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-white group-hover:text-amber-400 transition truncate">
                    {s.name}
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition shrink-0 ml-1" />
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5">{s.note}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-amber-600 animate-spin mx-auto" />
          <p className="text-amber-900 font-medium text-sm">{loadingMessage}</p>
          <p className="text-amber-700 text-xs">
            Parsing layout, extracting transaction rows, checking reconciliations...
          </p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Analysis Error</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Drag & Drop Area if no statements analyzed yet */}
      {!loading && analyzedResults.length === 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 hover:border-amber-500 rounded-2xl p-12 text-center bg-white hover:bg-amber-50/20 cursor-pointer transition flex flex-col items-center justify-center space-y-4 shadow-sm"
        >
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <Upload className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              Upload your Bank Statement PDF
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Drag & drop your file here, or click to browse. Supports PDF statements from HBL, Askari Bank, Bank of Punjab, UBL, easypaisa, Allied Bank, and all major banks.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
            <FileText className="h-3.5 w-3.5 text-gray-500" />
            PDF format up to 50MB
          </span>
        </div>
      )}

      {/* Main Results View */}
      {activeResult && (
        <div className="space-y-6">
          {/* Statement Switcher Tabs (if multiple statements analyzed) */}
          {analyzedResults.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1">
                Statements:
              </span>
              {analyzedResults.map((res, idx) => (
                <button
                  key={`${res.fileName}-${idx}`}
                  onClick={() => {
                    setActiveResultIndex(idx)
                    setCurrentPage(1)
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                    idx === activeResultIndex
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>{res.fileName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">
                    {res.transactions.length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Statement Overview Header Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      {activeResult.metadata.accountTitle || 'Account Holder'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      {activeResult.bankDetected}
                    </span>
                    {activeResult.summary.reconciliationMatched && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Reconciled
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                    {activeResult.metadata.accountNumber && (
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3 text-gray-400" />
                        A/C: <span className="font-mono font-medium text-gray-700">{activeResult.metadata.accountNumber}</span>
                      </span>
                    )}
                    {activeResult.metadata.iban && (
                      <span className="flex items-center gap-1">
                        IBAN: <span className="font-mono font-medium text-gray-700">{activeResult.metadata.iban}</span>
                      </span>
                    )}
                    {activeResult.metadata.branchName && (
                      <span className="flex items-center gap-1">
                        Branch: <span className="text-gray-700">{activeResult.metadata.branchName}</span>
                      </span>
                    )}
                    {(activeResult.metadata.periodFrom || activeResult.summary.startDate) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        Period: <span className="text-gray-700 font-medium">
                          {formatDate(activeResult.metadata.periodFrom || activeResult.summary.startDate!)} to{' '}
                          {formatDate(activeResult.metadata.periodTo || activeResult.summary.endDate!)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Export & Import */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                  title="Download CSV of current table"
                >
                  <Download className="h-3.5 w-3.5 text-gray-500" />
                  Export CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                  title="Download JSON analysis"
                >
                  <Download className="h-3.5 w-3.5 text-gray-500" />
                  JSON
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm transition"
                >
                  <Database className="h-3.5 w-3.5 text-amber-400" />
                  Import to Ledger
                </button>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Deposits / Incoming */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-800">
                    {activeResult.bankDetected.toLowerCase().includes('easypaisa')
                      ? 'Total Incoming'
                      : 'Total Deposits (Cr)'}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-emerald-700 mt-2">
                  {formatCurrency(activeResult.summary.totalCredits)}
                </div>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {activeResult.summary.creditCount} transactions
                </p>
              </div>

              {/* Total Withdrawals / Outgoing */}
              <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-rose-800">
                    {activeResult.bankDetected.toLowerCase().includes('easypaisa')
                      ? 'Total Outgoing'
                      : 'Total Withdrawals (Dr)'}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-rose-700 mt-2">
                  {formatCurrency(activeResult.summary.totalDebits)}
                </div>
                <p className="text-xs text-rose-600 mt-0.5">
                  {activeResult.summary.debitCount} transactions
                </p>
              </div>

              {/* Net Cash Flow */}
              <div
                className={`border rounded-xl p-4 ${
                  activeResult.summary.netFlow >= 0
                    ? 'bg-blue-50/60 border-blue-100'
                    : 'bg-amber-50/60 border-amber-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      activeResult.summary.netFlow >= 0 ? 'text-blue-800' : 'text-amber-800'
                    }`}
                  >
                    Net Cash Flow
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500">
                    {activeResult.summary.totalTransactions} total txs
                  </span>
                </div>
                <div
                  className={`text-xl font-bold mt-2 ${
                    activeResult.summary.netFlow >= 0 ? 'text-blue-700' : 'text-amber-700'
                  }`}
                >
                  {activeResult.summary.netFlow >= 0 ? '+' : ''}
                  {formatCurrency(activeResult.summary.netFlow)}
                </div>
                <p
                  className={`text-xs mt-0.5 ${
                    activeResult.summary.netFlow >= 0 ? 'text-blue-600' : 'text-amber-600'
                  }`}
                >
                  {activeResult.summary.netFlow >= 0 ? 'Net positive savings' : 'Net drawdown'}
                </p>
              </div>

              {/* Closing Balance */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">Closing Balance</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {activeResult.pageCount} pages
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 mt-2">
                  {activeResult.metadata.closingBalance !== null
                    ? formatCurrency(activeResult.metadata.closingBalance)
                    : activeResult.summary.calculatedClosingBalance !== null
                    ? formatCurrency(activeResult.summary.calculatedClosingBalance)
                    : '—'}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Opening: {activeResult.metadata.openingBalance !== null ? formatCurrency(activeResult.metadata.openingBalance) : 'PKR 0'}
                </p>
              </div>
            </div>
          </div>

          {/* Filter, Search & Table Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Filter Toolbar */}
            <div className="p-4 border-b border-gray-200 bg-gray-50/50 space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Box */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    placeholder="Search by description, reference, amount, or date..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Type Filter */}
                  <div className="flex items-center bg-gray-200/70 p-0.5 rounded-lg text-xs font-medium">
                    <button
                      onClick={() => {
                        setTypeFilter('ALL')
                        setCurrentPage(1)
                      }}
                      className={`px-3 py-1.5 rounded-md transition ${
                        typeFilter === 'ALL'
                          ? 'bg-white text-gray-900 shadow-xs font-semibold'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      All ({activeResult.transactions.length})
                    </button>
                    <button
                      onClick={() => {
                        setTypeFilter('CREDIT')
                        setCurrentPage(1)
                      }}
                      className={`px-3 py-1.5 rounded-md transition ${
                        typeFilter === 'CREDIT'
                          ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Incoming / Credits ({activeResult.summary.creditCount})
                    </button>
                    <button
                      onClick={() => {
                        setTypeFilter('DEBIT')
                        setCurrentPage(1)
                      }}
                      className={`px-3 py-1.5 rounded-md transition ${
                        typeFilter === 'DEBIT'
                          ? 'bg-white text-rose-700 shadow-xs font-semibold'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Outgoing / Debits ({activeResult.summary.debitCount})
                    </button>
                  </div>

                  {/* Category / Purpose Selector */}
                  <select
                    value={purposeFilter}
                    onChange={(e) => {
                      setPurposeFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ALL">All Categories</option>
                    {availablePurposes.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>

                  {/* Clear Filters Button if any active */}
                  {(searchQuery ||
                    typeFilter !== 'ALL' ||
                    purposeFilter !== 'ALL' ||
                    dateFrom ||
                    dateTo ||
                    minAmount ||
                    maxAmount) && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setTypeFilter('ALL')
                        setPurposeFilter('ALL')
                        setDateFrom('')
                        setDateTo('')
                        setMinAmount('')
                        setMaxAmount('')
                        setCurrentPage(1)
                      }}
                      className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Extended Date & Amount Filters */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span>From:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="px-2 py-1 border border-gray-300 rounded-md bg-white"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span>To:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="px-2 py-1 border border-gray-300 rounded-md bg-white"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Min PKR:</span>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => {
                      setMinAmount(e.target.value)
                      setCurrentPage(1)
                    }}
                    placeholder="0"
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md bg-white"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Max PKR:</span>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => {
                      setMaxAmount(e.target.value)
                      setCurrentPage(1)
                    }}
                    placeholder="Any"
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md bg-white"
                  />
                </div>

                <div className="ml-auto text-xs text-gray-500 font-medium">
                  Showing <span className="font-semibold text-gray-900">{totalFilteredCount}</span> of{' '}
                  <span className="font-semibold text-gray-900">{activeResult.transactions.length}</span> transactions
                  {totalFilteredCount !== activeResult.transactions.length && (
                    <span className="ml-2 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Filtered Net: {formatCurrency(filteredTotals.net)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th
                      onClick={() => toggleSort('date')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-gray-100 transition whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date</span>
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('description')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-gray-100 transition min-w-[280px]"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Description / Particulars</span>
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      </div>
                    </th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Category</th>
                    <th
                      onClick={() => toggleSort('outgoing')}
                      className="px-4 py-3.5 text-right cursor-pointer hover:bg-gray-100 transition whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>
                          {activeResult.bankDetected.toLowerCase().includes('easypaisa')
                            ? 'Outgoing'
                            : 'Outgoing (Debit)'}
                        </span>
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('incoming')}
                      className="px-4 py-3.5 text-right cursor-pointer hover:bg-gray-100 transition whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>
                          {activeResult.bankDetected.toLowerCase().includes('easypaisa')
                            ? 'Incoming'
                            : 'Incoming (Credit)'}
                        </span>
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('balance')}
                      className="px-4 py-3.5 text-right cursor-pointer hover:bg-gray-100 transition whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Balance</span>
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <div className="font-medium text-gray-900">
                          {formatDate(tx.date)}
                        </div>
                        {tx.valueDate && tx.valueDate !== tx.date && (
                          <div className="text-[10px] text-gray-400">
                            Val: {formatDate(tx.valueDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-800">
                        <div className="font-medium text-gray-900 leading-snug">
                          {tx.description}
                        </div>
                        {tx.reference && (
                          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                            Ref: {tx.reference}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md border ${getPurposeColor(
                            tx.purpose
                          )}`}
                        >
                          {tx.purpose}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs whitespace-nowrap font-mono">
                        {tx.type === 'DEBIT' ? (
                          <span className="font-semibold text-rose-700 bg-rose-50/80 px-2 py-0.5 rounded border border-rose-100">
                            -{formatCurrency(tx.amount)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs whitespace-nowrap font-mono">
                        {tx.type === 'CREDIT' ? (
                          <span className="font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-100">
                            +{formatCurrency(tx.amount)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-mono text-gray-800 whitespace-nowrap font-medium">
                        {tx.balance !== null ? formatCurrency(tx.balance) : '—'}
                      </td>
                    </tr>
                  ))}

                  {paginatedTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        No transactions found matching the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10))
                    setCurrentPage(1)
                  }}
                  className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs"
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value={-1}>Show All</option>
                </select>
                <span>
                  Page {currentPage} of {totalPages || 1}
                </span>
              </div>

              {pageSize !== -1 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-40 transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import to System Modal */}
      {showImportModal && activeResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-gray-900 text-base">
                  Import Extracted Transactions
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              You can import all{' '}
              <strong className="text-gray-900">{activeResult.transactions.length}</strong>{' '}
              extracted transactions from{' '}
              <strong className="text-gray-900">{activeResult.fileName}</strong> directly into
              the ledger under an existing account.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Target Account *
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">— Select an account —</option>
                  {accounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.client_name} — {a.account_category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1.5 text-gray-600">
                <div className="flex justify-between">
                  <span>Transactions to import:</span>
                  <span className="font-semibold text-gray-900">
                    {activeResult.transactions.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Deposits:</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(activeResult.summary.totalCredits)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Withdrawals:</span>
                  <span className="font-semibold text-rose-600">
                    {formatCurrency(activeResult.summary.totalDebits)}
                  </span>
                </div>
              </div>

              {importSuccess && (
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg text-xs font-medium border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {importSuccess}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedAccountId || importing}
                onClick={handleImportToDatabase}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition"
              >
                {importing && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {importing ? 'Importing Transactions…' : 'Confirm & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
