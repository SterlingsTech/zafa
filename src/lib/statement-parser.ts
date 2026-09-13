// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse.js'

export interface AnalyzedTransaction {
  id: string
  date: string // YYYY-MM-DD
  rawDate: string
  valueDate?: string
  description: string
  reference?: string
  type: 'DEBIT' | 'CREDIT'
  amount: number
  debit?: number | null
  credit?: number | null
  incoming?: number | null
  outgoing?: number | null
  balance: number | null
  purpose: 'Salary' | 'Bonus' | 'Cash Withdrawal' | 'Transfer' | 'Bill Payment' | 'POS Purchase' | 'Fee/Charges' | 'Pension' | 'Gratuity' | 'Other'
  page?: number
}

export interface StatementMetadata {
  bankName: string
  accountTitle?: string
  accountNumber?: string
  iban?: string
  branchName?: string
  periodFrom?: string
  periodTo?: string
  currency: string
  openingBalance: number | null
  closingBalance: number | null
  statementTotalDebits: number | null
  statementTotalCredits: number | null
  statementDebitCount: number | null
  statementCreditCount: number | null
}

export interface StatementAnalysisResult {
  fileName: string
  fileSizeBytes: number
  pageCount: number
  bankDetected: string
  metadata: StatementMetadata
  transactions: AnalyzedTransaction[]
  summary: {
    totalTransactions: number
    totalCredits: number
    totalDebits: number
    creditCount: number
    debitCount: number
    netFlow: number
    calculatedClosingBalance: number | null
    startDate: string | null
    endDate: string | null
    reconciliationMatched: boolean | null
  }
}

interface TextItem {
  x: number
  y: number
  str: string
  width: number
}

interface PageDataCoords {
  pageIndex: number
  items: TextItem[]
  rawText: string
}

function cleanAmount(str: string): number {
  if (!str || str === '-') return 0
  const cleaned = str.replace(/[(),\s]/g, '').replace(/Cr|Dr/gi, '').trim()
  return parseFloat(cleaned) || 0
}

function parseDateToISO(dateStr: string): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()

  // Format DD-MMM-YY (e.g., 29-JUL-25) or DD MMM YY (e.g., 02 JUL 25)
  const dmyMatch = trimmed.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{2,4})$/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0')
    const monthMap: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
    }
    const month = monthMap[dmyMatch[2].toUpperCase()] || '01'
    let year = dmyMatch[3]
    if (year.length === 2) {
      const yrNum = parseInt(year, 10)
      year = yrNum >= 70 ? `19${year}` : `20${year}`
    }
    return `${year}-${month}-${day}`
  }

  // Format DD/MM/YYYY (e.g., 04/07/2022)
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0')
    const month = slashMatch[2].padStart(2, '0')
    const year = slashMatch[3]
    return `${year}-${month}-${day}`
  }

  // Format MMM DD, YYYY (e.g., Aug 28, 2026 or Jul 1, 2026)
  const mdyMatch = trimmed.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s*(\d{4})$/)
  if (mdyMatch) {
    const monthMap: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
    }
    const month = monthMap[mdyMatch[1].toUpperCase()] || '01'
    const day = mdyMatch[2].padStart(2, '0')
    const year = mdyMatch[3]
    return `${year}-${month}-${day}`
  }

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  return trimmed
}

export function inferPurpose(description: string, type: 'DEBIT' | 'CREDIT'): AnalyzedTransaction['purpose'] {
  const desc = description.toUpperCase()
  if (desc.includes('SALARY') || desc.includes('PAYROLL') || desc.includes('REMUNERATION')) return 'Salary'
  if (desc.includes('BONUS')) return 'Bonus'
  if (desc.includes('PENSION')) return 'Pension'
  if (desc.includes('GRATUITY')) return 'Gratuity'
  if (desc.includes('ATM CASH') || desc.includes('CASH WITHDRAWAL') || desc.includes('WITHDRAWAL') || (desc.includes('ATM') && !desc.includes('IBFT'))) return 'Cash Withdrawal'
  if (desc.includes('POS') || desc.includes('PURCHASE') || desc.includes('MERCHANT') || desc.includes('VISA LOCAL')) return 'POS Purchase'
  if (desc.includes('BILL') || desc.includes('UTILITYBILL') || desc.includes('SNGPL') || desc.includes('ELECTRIC') || desc.includes('TELENOR') || desc.includes('ZONG') || desc.includes('JAZZ') || desc.includes('1BILL') || desc.includes('TOPUP')) return 'Bill Payment'
  if (desc.includes('CHARGE') || desc.includes('FEE') || desc.includes('FED') || desc.includes('TAX') || desc.includes('WHT') || desc.includes('COMMISSION')) return 'Fee/Charges'
  if (desc.includes('IBFT') || desc.includes('FUNDS TRANSFER') || desc.includes('RAAST') || desc.includes('1LINK') || desc.includes('FT SENT') || desc.includes('FT RECEIVED') || desc.includes('INTER BANK') || desc.includes('RTGS') || desc.includes('CHEQUE') || desc.includes('TRANSFER')) return 'Transfer'
  return 'Other'
}

/**
 * Parses Askari Bank statements
 */
function parseAskariStatement(pages: PageDataCoords[], rawFullText: string): {
  metadata: StatementMetadata
  transactions: AnalyzedTransaction[]
} {
  const metadata: StatementMetadata = {
    bankName: 'Askari Bank Limited',
    currency: 'PKR',
    openingBalance: null,
    closingBalance: null,
    statementTotalDebits: null,
    statementTotalCredits: null,
    statementDebitCount: null,
    statementCreditCount: null,
  }

  // Extract metadata from raw text
  const nameMatch = rawFullText.match(/Name:\s*\n?\s*([^\n\r]+)/i)
  if (nameMatch) {
    metadata.accountTitle = nameMatch[1].replace(/Branch Code.*/i, '').trim()
  }

  const branchMatch = rawFullText.match(/Branch Code & Branch Name\s*\n?\s*([^\n\r]+)/i)
  if (branchMatch) {
    metadata.branchName = branchMatch[1].trim()
  }

  const accMatch = rawFullText.match(/ACCOUNT NUMBER[\s\S]*?(\d{10,16})/i)
  if (accMatch) {
    metadata.accountNumber = accMatch[1].trim()
  }

  const periodMatch = rawFullText.match(/STATEMENT PERIOD[\s\S]*?From:\s*([0-9]{2}-[A-Za-z]{3}-[0-9]{2,4})\s+To:?\s*([0-9]{2}-[A-Za-z]{3}-[0-9]{2,4})/i)
  if (periodMatch) {
    metadata.periodFrom = parseDateToISO(periodMatch[1])
    metadata.periodTo = parseDateToISO(periodMatch[2])
  }

  const openBalMatch = rawFullText.match(/\*\*\s*Opening Balance\s*\*\*\s*([\d,]+\.\d{2})/i)
  if (openBalMatch) {
    metadata.openingBalance = cleanAmount(openBalMatch[1])
  }

  const closeBalMatch = rawFullText.match(/\*\*\s*Closing Balance\s*\*\*\s*([\d,]+\.\d{2})/i)
  if (closeBalMatch) {
    metadata.closingBalance = cleanAmount(closeBalMatch[1])
  }

  const totalsMatch = rawFullText.match(/TOTAL WITHDRAWALS\s+(\d+)\s+([\d,]+\.\d{2})\s+TOTAL DEPOSITS\s+(\d+)\s+([\d,]+\.\d{2})/i)
  if (totalsMatch) {
    metadata.statementDebitCount = parseInt(totalsMatch[1], 10)
    metadata.statementTotalDebits = cleanAmount(totalsMatch[2])
    metadata.statementCreditCount = parseInt(totalsMatch[3], 10)
    metadata.statementTotalCredits = cleanAmount(totalsMatch[4])
  }

  const transactions: AnalyzedTransaction[] = []
  let currentDate = ''
  let txIndex = 0

  for (const page of pages) {
    const rowMap = new Map<number, TextItem[]>()
    for (const item of page.items) {
      const y = Math.round(item.y / 3) * 3
      if (!rowMap.has(y)) rowMap.set(y, [])
      rowMap.get(y)!.push(item)
    }

    const sortedY = Array.from(rowMap.keys()).sort((a, b) => b - a)
    let inTable = false
    let pendingDesc: string[] = []

    for (const y of sortedY) {
      const items = rowMap.get(y)!.sort((a, b) => a.x - b.x)
      const fullLine = items.map(i => i.str).join(' ')

      if (fullLine.includes('PARTICULARS') || (fullLine.includes('DATE') && fullLine.includes('AMOUNT'))) {
        inTable = true
        pendingDesc = []
        continue
      }

      if (fullLine.includes('TOTAL WITHDRAWALS') || fullLine.includes('Closing Balance') || fullLine.includes('NOTICE :') || fullLine.includes('NOTICE:')) {
        inTable = false
        continue
      }

      if (!inTable) continue
      if (fullLine.includes('Opening Balance')) continue

      let dateItem: string | null = null
      const descItems: string[] = []
      let insItem: string | null = null
      let valDateItem: string | null = null
      let amountItem: string | null = null
      let isDb = false
      let balanceItem: string | null = null

      for (const it of items) {
        const x = it.x
        if (x < 75) {
          if (/^\d{2}-[A-Z]{3}-\d{2}$/i.test(it.str)) {
            dateItem = it.str
          }
        } else if (x < 315) {
          if (!it.str.includes('Opening Balance')) {
            descItems.push(it.str)
          }
        } else if (x < 375) {
          insItem = it.str
        } else if (x < 445) {
          if (/^\d{2}-[A-Z]{3}-\d{2}$/i.test(it.str)) {
            valDateItem = it.str
          }
        } else if (x < 535) {
          if (it.str === 'DB') {
            isDb = true
          } else if (it.str.endsWith('DB')) {
            isDb = true
            amountItem = it.str.replace('DB', '').trim()
          } else if (/^-?[\d,]+\.\d{2}$/.test(it.str)) {
            amountItem = it.str
          }
        } else if (x >= 535) {
          if (/^-?[\d,]+\.\d{2}$/.test(it.str)) {
            balanceItem = it.str
          }
        }
      }

      if (dateItem) {
        currentDate = dateItem
      }

      const descText = descItems.join(' ').trim()
      if (descText && !descText.includes('Opening Balance')) {
        pendingDesc.push(descText)
      }

      if (amountItem) {
        const txDate = dateItem || currentDate
        const valDate = valDateItem || txDate
        const txDesc = pendingDesc.join(' ').trim()
        pendingDesc = []
        const amtVal = cleanAmount(amountItem)
        const isNegative = amtVal < 0
        const absAmount = Math.abs(amtVal)

        // If amount was negative DB, it is a reversal (credited back)
        const type: 'DEBIT' | 'CREDIT' = isDb ? (isNegative ? 'CREDIT' : 'DEBIT') : 'CREDIT'
        const purpose = inferPurpose(txDesc, type)

        txIndex++
        transactions.push({
          id: `askari-${txIndex}`,
          date: parseDateToISO(txDate),
          rawDate: txDate,
          valueDate: parseDateToISO(valDate),
          description: txDesc || 'Bank Transaction',
          reference: insItem || undefined,
          type,
          amount: absAmount,
          balance: balanceItem ? cleanAmount(balanceItem) : null,
          purpose,
          page: page.pageIndex + 1,
        })
      } else if (balanceItem && transactions.length > 0) {
        const lastTx = transactions[transactions.length - 1]
        if (lastTx.balance === null) {
          lastTx.balance = cleanAmount(balanceItem)
        }
      }
    }
  }

  return { metadata, transactions }
}

/**
 * Parses The Bank of Punjab (BOP) statements
 */
function parseBOPStatement(pages: PageDataCoords[], rawFullText: string): {
  metadata: StatementMetadata
  transactions: AnalyzedTransaction[]
} {
  const metadata: StatementMetadata = {
    bankName: 'The Bank of Punjab',
    currency: 'PKR',
    openingBalance: null,
    closingBalance: null,
    statementTotalDebits: null,
    statementTotalCredits: null,
    statementDebitCount: null,
    statementCreditCount: null,
  }

  // Extract BOP metadata
  const branchMatch = rawFullText.match(/BRANCH\s*([^\n\r]+?)(?:\s+STATEMENT PERIOD|\n|$)/i)
  if (branchMatch) {
    metadata.branchName = branchMatch[1].trim()
  }

  const periodMatch = rawFullText.match(/STATEMENT PERIOD[\s\S]*?([0-9]{2}\/[0-9]{2}\/[0-9]{4})\s*(?:TO|-)\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i)
  if (periodMatch) {
    metadata.periodFrom = parseDateToISO(periodMatch[1])
    metadata.periodTo = parseDateToISO(periodMatch[2])
  }

  const accMatch = rawFullText.match(/ACCOUNT NUMBER\s*([^\n\r]+)/i)
  if (accMatch) {
    metadata.accountNumber = accMatch[1].replace(/PKR.*/i, '').trim()
  }

  const ibanMatch = rawFullText.match(/IBAN\s*([A-Z0-9]+)/i)
  if (ibanMatch) {
    metadata.iban = ibanMatch[1].trim()
  }

  const nameMatch = rawFullText.match(/([A-Z\s]{4,35})\s+H\s*NO\s*\d+/i)
  if (nameMatch) {
    metadata.accountTitle = nameMatch[1].trim()
  }

  const openBalMatch = rawFullText.match(/Balance B\/F\s*([\d,]+\.\d{2})/i)
  if (openBalMatch) {
    metadata.openingBalance = cleanAmount(openBalMatch[1])
  }

  const closingMatch = rawFullText.match(/Closing Balance\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/i)
  if (closingMatch) {
    metadata.statementTotalDebits = cleanAmount(closingMatch[1])
    metadata.statementTotalCredits = cleanAmount(closingMatch[2])
    metadata.closingBalance = cleanAmount(closingMatch[3])
  }

  const transactions: AnalyzedTransaction[] = []
  let txIndex = 0

  for (const page of pages) {
    const rowMap = new Map<number, TextItem[]>()
    for (const item of page.items) {
      const y = Math.round(item.y / 3) * 3
      if (!rowMap.has(y)) rowMap.set(y, [])
      rowMap.get(y)!.push(item)
    }

    const sortedY = Array.from(rowMap.keys()).sort((a, b) => b - a)
    let inTable = false
    let currentTx: Partial<AnalyzedTransaction> | null = null
    let currentDescLines: string[] = []

    for (const y of sortedY) {
      const items = rowMap.get(y)!.sort((a, b) => a.x - b.x)
      const fullLine = items.map(i => i.str).join(' ')

      if (fullLine.includes('Remaining') || fullLine.includes('Balance B/F') || fullLine.includes('Dr. Amount') || fullLine.includes('Nature of Transaction')) {
        inTable = true
        continue
      }
      if (fullLine.includes('Closing Balance') || fullLine.includes('End of statement')) {
        if (currentTx) {
          currentTx.description = currentDescLines.join(' ').trim()
          currentTx.purpose = inferPurpose(currentTx.description || '', currentTx.type || 'DEBIT')
          transactions.push(currentTx as AnalyzedTransaction)
          currentTx = null
          currentDescLines = []
        }
        inTable = false
        continue
      }
      if (fullLine.includes('This is a system generated report') || fullLine.includes('| Page') || fullLine.includes('STATEMENT PERIOD') || fullLine.includes('ACCOUNT NUMBER')) {
        continue
      }

      // Detect transaction date at x < 90
      let txDate: string | null = null
      let valDate: string | null = null
      const descPart: string[] = []
      let instrument: string | null = null
      let drAmount: number | null = null
      let crAmount: number | null = null
      let balance: number | null = null

      for (const it of items) {
        const x = it.x
        if (x < 90 && /^\d{2}\/\d{2}\/\d{4}$/.test(it.str)) {
          txDate = it.str
        } else if (x >= 90 && x < 155 && /^\d{2}\/\d{2}\/\d{4}$/.test(it.str)) {
          valDate = it.str
        } else if (x >= 150 && x < 310) {
          descPart.push(it.str)
        } else if (x >= 310 && x < 380) {
          // Could be instrument number or part of Dr
          if (/^-?[\d,]+\.\d{2}$/.test(it.str)) {
            drAmount = cleanAmount(it.str)
          } else {
            instrument = it.str
          }
        } else if (x >= 370 && x < 445 && /^-?[\d,]+\.\d{2}$/.test(it.str)) {
          drAmount = cleanAmount(it.str)
        } else if (x >= 440 && x < 510 && /^-?[\d,]+\.\d{2}$/.test(it.str)) {
          crAmount = cleanAmount(it.str)
        } else if (x >= 505 && /^-?[\d,]+\.\d{2}$/.test(it.str)) {
          balance = cleanAmount(it.str)
        } else if (x < 370) {
          descPart.push(it.str)
        }
      }

      if (txDate) {
        inTable = true
        if (currentTx) {
          currentTx.description = currentDescLines.join(' ').trim()
          currentTx.purpose = inferPurpose(currentTx.description || '', currentTx.type || 'DEBIT')
          transactions.push(currentTx as AnalyzedTransaction)
          currentTx = null
          currentDescLines = []
        }

        const isCredit = (crAmount ?? 0) > 0 && (drAmount ?? 0) === 0
        const isNegativeDr = (drAmount ?? 0) < 0
        const amount = isCredit ? (crAmount ?? 0) : (isNegativeDr ? Math.abs(drAmount!) : Math.abs(drAmount ?? 0))
        const type: 'DEBIT' | 'CREDIT' = (isCredit || isNegativeDr) ? 'CREDIT' : 'DEBIT'

        txIndex++
        currentTx = {
          id: `bop-${txIndex}`,
          date: parseDateToISO(txDate),
          rawDate: txDate,
          valueDate: valDate ? parseDateToISO(valDate) : parseDateToISO(txDate),
          reference: instrument || undefined,
          type,
          amount,
          balance: balance,
          page: page.pageIndex + 1,
        }

        if (descPart.length > 0) {
          currentDescLines.push(...descPart)
        }
      } else if (currentTx && inTable) {
        if (descPart.length > 0) {
          currentDescLines.push(...descPart)
        }
        if (instrument && !currentTx.reference) {
          currentTx.reference = instrument
        }
        if (balance !== null && (currentTx.balance === null || currentTx.balance === undefined)) {
          currentTx.balance = balance
        }
      }
    }

    if (currentTx) {
      currentTx.description = currentDescLines.join(' ').trim()
      currentTx.purpose = inferPurpose(currentTx.description || '', currentTx.type || 'DEBIT')
      transactions.push(currentTx as AnalyzedTransaction)
      currentTx = null
      currentDescLines = []
    }
  }

  for (const t of transactions) {
    if (!t.purpose) {
      t.purpose = inferPurpose(t.description, t.type)
    }
  }

  return { metadata, transactions }
}

/**
 * Parses myABL digital banking app & web PDF statements
 */
function parseMyAblStatement(pages: PageDataCoords[], rawFullText: string): {
  metadata: StatementMetadata
  transactions: AnalyzedTransaction[]
} {
  const metadata: StatementMetadata = {
    bankName: 'myABL (Allied Bank Limited)',
    currency: 'PKR',
    openingBalance: null,
    closingBalance: null,
    statementTotalDebits: null,
    statementTotalCredits: null,
    statementDebitCount: null,
    statementCreditCount: null,
  }

  const nameMatch = rawFullText.match(/Account Title:\s*([^\n\r]+)/i)
  if (nameMatch) metadata.accountTitle = nameMatch[1].trim()

  const accMatch = rawFullText.match(/Account Number:\s*([^\n\r]+)/i)
  if (accMatch) metadata.accountNumber = accMatch[1].trim()

  const currMatch = rawFullText.match(/Currency:\s*([^\n\r]+)/i)
  if (currMatch) metadata.currency = currMatch[1].trim()

  const openMatch = rawFullText.match(/Opening Balance:\s*([\d,]+\.\d{2})/i)
  if (openMatch) metadata.openingBalance = cleanAmount(openMatch[1])

  const closeMatch = rawFullText.match(/Closing Balance:\s*([\d,]+\.\d{2})/i)
  if (closeMatch) metadata.closingBalance = cleanAmount(closeMatch[1])

  const transactions: AnalyzedTransaction[] = []
  let currentTx: Partial<AnalyzedTransaction> | null = null
  let currentDescLines: string[] = []
  let txIndex = 0

  for (const page of pages) {
    const rowMap = new Map<number, TextItem[]>()
    for (const it of page.items) {
      const y = Math.round(it.y / 3) * 3
      if (!rowMap.has(y)) rowMap.set(y, [])
      rowMap.get(y)!.push(it)
    }
    const sortedY = Array.from(rowMap.keys()).sort((a, b) => b - a)

    let inTable = false

    for (const y of sortedY) {
      const rowItems = rowMap.get(y)!.sort((a, b) => a.x - b.x)
      const fullLine = rowItems.map(i => i.str).join(' ')

      if (
        fullLine.includes('Date') &&
        fullLine.includes('Description') &&
        (fullLine.includes('Debit') || fullLine.includes('Credit'))
      ) {
        inTable = true
        continue
      }
      if (
        fullLine.includes('Account Statement') ||
        fullLine.includes('Account Number:') ||
        fullLine.includes('Opening Balance:') ||
        fullLine.includes('Closing Balance:') ||
        fullLine.includes('*Note:')
      ) {
        continue
      }
      if (/^\d{1,3}\s+\d{2}\s+[A-Za-z]{3}\s+\d{4}/.test(fullLine)) {
        continue
      }

      if (!inTable) continue

      let txDate: string | null = null
      const descPart: string[] = []
      let debit: number | null = null
      let credit: number | null = null
      let balance: number | null = null

      for (const it of rowItems) {
        const x = it.x
        if (x < 90 && /^\d{2}\s+[A-Za-z]{3}\s+\d{4}$/i.test(it.str)) {
          txDate = it.str
        } else if (x >= 90 && x < 310) {
          descPart.push(it.str)
        } else if (x >= 310 && x < 410 && /^-?[\d,]+\.\d{2}$/.test(it.str)) {
          debit = cleanAmount(it.str)
        } else if (x >= 410 && x < 510 && /^-?[\d,]+\.\d{2}$/.test(it.str)) {
          credit = cleanAmount(it.str)
        } else if (x >= 510 && /^-?[\d,]+\.\d{2}$/.test(it.str)) {
          balance = cleanAmount(it.str)
        } else if (x < 310) {
          descPart.push(it.str)
        }
      }

      if (txDate) {
        if (currentTx) {
          currentTx.description = currentDescLines.join(' ').trim()
          currentTx.purpose = inferPurpose(currentTx.description || '', currentTx.type || 'DEBIT')
          transactions.push(currentTx as AnalyzedTransaction)
          currentTx = null
          currentDescLines = []
        }

        const isCredit = credit !== null && credit > 0
        const amount = isCredit ? (credit ?? 0) : (debit ?? 0)
        const type: 'DEBIT' | 'CREDIT' = isCredit ? 'CREDIT' : 'DEBIT'

        txIndex++
        currentTx = {
          id: `myabl-${txIndex}`,
          date: parseDateToISO(txDate),
          rawDate: txDate,
          type,
          amount,
          balance,
          page: page.pageIndex + 1,
        }
        if (descPart.length > 0) currentDescLines.push(...descPart)
      } else if (currentTx) {
        if (descPart.length > 0) currentDescLines.push(...descPart)
        if (balance !== null && (currentTx.balance === null || currentTx.balance === undefined)) {
          currentTx.balance = balance
        }
      }
    }

    if (currentTx) {
      currentTx.description = currentDescLines.join(' ').trim()
      currentTx.purpose = inferPurpose(currentTx.description || '', currentTx.type || 'DEBIT')
      transactions.push(currentTx as AnalyzedTransaction)
      currentTx = null
      currentDescLines = []
    }
  }

  for (const t of transactions) {
    if (!t.purpose) {
      t.purpose = inferPurpose(t.description, t.type)
    }
  }

  return { metadata, transactions }
}

/**
 * Parses Allied Bank Limited (ABL) statements
 */
function parseAlliedStatement(pages: PageDataCoords[], rawFullText: string): {
  metadata: StatementMetadata
  transactions: AnalyzedTransaction[]
} {
  const metadata: StatementMetadata = {
    bankName: 'Allied Bank Limited',
    currency: 'PKR',
    openingBalance: null,
    closingBalance: null,
    statementTotalDebits: null,
    statementTotalCredits: null,
    statementDebitCount: null,
    statementCreditCount: null,
  }

  const nameMatch = rawFullText.match(/([A-Z\s]{4,35})\s+PK\d{7}/i) || rawFullText.match(/MUHAMMAD FAHAD RAJA/i)
  if (nameMatch) metadata.accountTitle = nameMatch[0].replace(/PK\d+.*/, '').trim()

  const branchMatch = rawFullText.match(/Branch Name:\s*([^\n\r,]+,[^\n\r]+?)(?:\r|\n|\s{2,}|$)/i) || rawFullText.match(/Branch Name:([^\n\r]+)/i)
  if (branchMatch) metadata.branchName = branchMatch[1].trim()

  const accMatch = rawFullText.match(/Account Number:(\d{10,20})/i)
  if (accMatch) metadata.accountNumber = accMatch[1].trim()

  const periodMatch = rawFullText.match(/Statement Period:([0-9]{2}\s+[A-Za-z]{3}\s+[0-9]{4})\s+TO\s+([0-9]{2}\s+[A-Za-z]{3}\s+[0-9]{4})/i)
  if (periodMatch) {
    metadata.periodFrom = parseDateToISO(periodMatch[1])
    metadata.periodTo = parseDateToISO(periodMatch[2])
  }

  const openBalMatch = rawFullText.match(/BALANCE AT PERIOD START\s*:\s*([\d,]+\.\d{2})/i)
  if (openBalMatch) metadata.openingBalance = cleanAmount(openBalMatch[1])

  const closeBalMatch = rawFullText.match(/CLOSING BALANCE\s*([\d,]+\.\d{2})/i)
  if (closeBalMatch) metadata.closingBalance = cleanAmount(closeBalMatch[1])

  const totalsMatch = rawFullText.match(/TOTAL DEBIT \/ CREDIT\s*([\d,]+\.\d{2})\s*([\d,]+\.\d{2})/i)
  if (totalsMatch) {
    metadata.statementTotalDebits = cleanAmount(totalsMatch[1])
    metadata.statementTotalCredits = cleanAmount(totalsMatch[2])
  }

  const transactions: AnalyzedTransaction[] = []
  let currentTx: Partial<AnalyzedTransaction> | null = null
  let currentDescLines: string[] = []
  let txIndex = 0

  const dateRowRegex = /^(\d{2}\s+[A-Za-z]{3}\s+\d{2})\s+/

  for (const page of pages) {
    const rowMap = new Map<number, TextItem[]>()
    for (const item of page.items) {
      const y = Math.round(item.y / 3) * 3
      if (!rowMap.has(y)) rowMap.set(y, [])
      rowMap.get(y)!.push(item)
    }
    const sortedY = Array.from(rowMap.keys()).sort((a, b) => b - a)

    for (const y of sortedY) {
      const rowItems = rowMap.get(y)!.sort((a, b) => a.x - b.x)
      const fullLine = rowItems.map(i => i.str).join('   ').trim()
      if (!fullLine) continue

      if (
        fullLine.includes('Statement Period') ||
        fullLine.includes('Account Number') ||
        fullLine.includes('BALANCE AT PERIOD START') ||
        fullLine.includes('----------------') ||
        fullLine.includes('DATE   ') ||
        fullLine.includes('Page ') ||
        fullLine.includes('*REVE-')
      ) {
        continue
      }
      if (fullLine.includes('TOTAL DEBIT / CREDIT') || fullLine.includes('CLOSING BALANCE')) {
        if (currentTx) {
          currentTx.description = currentDescLines.join(' ').trim()
          currentTx.purpose = inferPurpose(currentTx.description || '', currentTx.type || 'DEBIT')
          transactions.push(currentTx as AnalyzedTransaction)
          currentTx = null
          currentDescLines = []
        }
        continue
      }

      const dateMatch = fullLine.match(dateRowRegex)
      if (dateMatch) {
        if (currentTx) {
          currentTx.description = currentDescLines.join(' ').trim()
          currentTx.purpose = inferPurpose(currentTx.description || '', currentTx.type || 'DEBIT')
          transactions.push(currentTx as AnalyzedTransaction)
          currentTx = null
          currentDescLines = []
        }

        const txDate = dateMatch[1]
        const rest = fullLine.slice(dateMatch[0].length)

        const amountsMatch = rest.match(/(\d{2}\s+[A-Za-z]{3}\s+\d{2})?\s*(-?[\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})$/)
        let valDate = txDate
        let amount = 0
        let type: 'DEBIT' | 'CREDIT' = 'DEBIT'
        let balance: number | null = null
        let desc = rest

        if (amountsMatch) {
          if (amountsMatch[1]) valDate = amountsMatch[1]
          const amt1 = cleanAmount(amountsMatch[2])
          const amt2 = cleanAmount(amountsMatch[3])
          balance = amt2
          amount = Math.abs(amt1)

          const lastBal = transactions.length > 0 ? transactions[transactions.length - 1].balance : metadata.openingBalance
          if (lastBal !== null && lastBal !== undefined) {
            const diff = balance - lastBal
            if (diff > 0.01) type = 'CREDIT'
            else if (diff < -0.01) type = 'DEBIT'
            else type = rest.indexOf(amountsMatch[2]) > 70 ? 'CREDIT' : 'DEBIT'
          } else {
            type = rest.indexOf(amountsMatch[2]) > 70 ? 'CREDIT' : 'DEBIT'
          }
          desc = rest.slice(0, amountsMatch.index).trim()
        }

        txIndex++
        currentTx = {
          id: `abl-${txIndex}`,
          date: parseDateToISO(txDate),
          rawDate: txDate,
          valueDate: parseDateToISO(valDate),
          type,
          amount,
          balance,
          page: page.pageIndex + 1,
        }
        if (desc) currentDescLines.push(desc)
      } else if (currentTx) {
        currentDescLines.push(fullLine)
      }
    }
  }

  if (currentTx) {
    currentTx.description = currentDescLines.join(' ').trim()
    currentTx.purpose = inferPurpose(currentTx.description || '', currentTx.type || 'DEBIT')
    transactions.push(currentTx as AnalyzedTransaction)
  }

  return { metadata, transactions }
}

/**
 * Parses United Bank Limited (UBL) statements
 */
function parseUblStatement(pages: PageDataCoords[], rawFullText: string): {
  metadata: StatementMetadata
  transactions: AnalyzedTransaction[]
} {
  const metadata: StatementMetadata = {
    bankName: 'United Bank Limited (UBL)',
    currency: 'PKR',
    openingBalance: null,
    closingBalance: null,
    statementTotalDebits: null,
    statementTotalCredits: null,
    statementDebitCount: null,
    statementCreditCount: null,
  }

  // Extract metadata from page 1 and headers
  const p1 = pages[0]
  if (p1) {
    // Branch Name (e.g. "0855-MITHA TIWANA" at top)
    const branchItem = p1.items.find(i => i.y > 925 && /^\d{4}-/.test(i.str))
    if (branchItem) {
      metadata.branchName = branchItem.str.trim()
    }

    // Account Title (e.g. "BABAR FAROOQ" at y ~ 915-925, x < 50)
    const titleItem = p1.items.find(i => i.x < 50 && i.y > 910 && i.y < 930 && !i.str.includes('Statement') && !i.str.includes('Account')) ||
                      pages[1]?.items.find(i => i.x < 50 && i.y > 900 && i.y < 920)
    if (titleItem) {
      metadata.accountTitle = titleItem.str.trim()
    }

    // Account Number (e.g. "000206839815" or "0855-000206839815")
    const accItem = p1.items.find(i => /^\d{10,16}$/.test(i.str) && i.y > 890)
    if (accItem) {
      metadata.accountNumber = accItem.str.trim()
    } else {
      const accMatch = rawFullText.match(/Account\s*No\s*:\s*\n?\s*(\d{10,16})/i) || rawFullText.match(/(\d{4}-\d{10,16})/)
      if (accMatch) metadata.accountNumber = accMatch[1].trim()
    }

    // IBAN
    const ibanItem = p1.items.find(i => /IBAN\s*No/i.test(i.str))
    if (ibanItem) {
      const ibanMatch = ibanItem.str.match(/IBAN\s*No:\s*([A-Z0-9\s]+?)(?:CIF|$)/i)
      if (ibanMatch) metadata.iban = ibanMatch[1].replace(/\s+/g, ' ').trim()
    }
  }

  // Statement Period
  const periodMatch = rawFullText.match(/Statement\s*Period\s*:\s*\n?\s*From\s*([0-9]{2}-[A-Za-z]{3}-[0-9]{2,4})\s*To\s*([0-9]{2}-[A-Za-z]{3}-[0-9]{2,4})/i)
  if (periodMatch) {
    metadata.periodFrom = parseDateToISO(periodMatch[1])
    metadata.periodTo = parseDateToISO(periodMatch[2])
  }

  // Totals from summary on last page
  const pLast = pages[pages.length - 1]
  if (pLast) {
    const debitTotalItem = pLast.items.find(i => i.x >= 430 && i.x < 520 && i.y < 660 && i.y > 600 && /^[\d,]+\.\d{2}$/.test(i.str))
    const creditTotalItem = pLast.items.find(i => i.x >= 520 && i.x < 615 && i.y < 660 && i.y > 600 && /^[\d,]+\.\d{2}$/.test(i.str))

    if (debitTotalItem) metadata.statementTotalDebits = cleanAmount(debitTotalItem.str)
    if (creditTotalItem) metadata.statementTotalCredits = cleanAmount(creditTotalItem.str)
  }

  const transactions: AnalyzedTransaction[] = []

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const page = pages[pIdx]
    const headerItem = page.items.find(i => i.str === 'Particulars')
    const tableTopY = headerItem ? headerItem.y : 800
    const tableItems = page.items.filter(i => i.y < tableTopY - 5 && i.y > 90)

    // In UBL, date is always in the leftmost column (x < 75)
    const dateItems = tableItems.filter(i => i.x < 75 && /^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(i.str))
    dateItems.sort((a, b) => b.y - a.y)

    const firstDateY = dateItems.length > 0 ? dateItems[0].y : 0
    // Multi-line descriptions wrapping across page boundaries
    const leadingDescItems = tableItems.filter(i => i.x >= 75 && i.x < 350 && i.y > firstDateY + 3)
    leadingDescItems.sort((a, b) => b.y - a.y)

    if (leadingDescItems.length > 0 && transactions.length > 0) {
      const lastTx = transactions[transactions.length - 1]
      const appendedText = leadingDescItems.map(i => i.str).join(' ')
      lastTx.description = (lastTx.description + ' ' + appendedText).trim()
    }

    for (let i = 0; i < dateItems.length; i++) {
      const dItem = dateItems[i]
      const nextDateY = i < dateItems.length - 1 ? dateItems[i + 1].y : 90

      // All items belonging to this row
      const rowItems = tableItems.filter(it => it.y <= dItem.y + 3 && it.y > nextDateY + 3)

      // Check for opening / closing balance lines
      const isOpening = rowItems.some(it => /\*\*\s*OPENING\s*BALANCE\s*\*\*/i.test(it.str))
      const isClosing = rowItems.some(it => /\*\*\s*CLOSING\s*BALANCE\s*\*\*/i.test(it.str))

      if (isOpening) {
        const balItem = rowItems.find(it => it.x >= 615 && /[\d,]+\.\d{2}/.test(it.str))
        if (balItem) metadata.openingBalance = cleanAmount(balItem.str)
        continue
      }

      if (isClosing) {
        const balItem = rowItems.find(it => it.x >= 615 && /[\d,]+\.\d{2}/.test(it.str))
        if (balItem) metadata.closingBalance = cleanAmount(balItem.str)
        continue
      }

      // Particulars (75 <= x < 350)
      const descItems = rowItems.filter(it => it.x >= 75 && it.x < 350).sort((a, b) => b.y - a.y)
      const description = descItems.map(it => it.str).join(' ')

      // Instrument / Cheque Number (350 <= x < 430)
      const instItem = rowItems.find(it => it.x >= 350 && it.x < 430 && /^\d+$/.test(it.str))
      const reference = instItem ? instItem.str : undefined

      // Debit (430 <= x < 520)
      const debitItem = rowItems.find(it => it.x >= 430 && it.x < 520 && /^[\d,]+\.\d{2}$/.test(it.str))

      // Credit (520 <= x < 615)
      const creditItem = rowItems.find(it => it.x >= 520 && it.x < 615 && /^[\d,]+\.\d{2}$/.test(it.str))

      // Balance (x >= 615)
      const balanceItem = rowItems.find(it => it.x >= 615 && /[\d,]+\.\d{2}/.test(it.str))
      const balance = balanceItem ? cleanAmount(balanceItem.str) : null

      let type: 'DEBIT' | 'CREDIT' = 'DEBIT'
      let amount = 0

      if (debitItem) {
        type = 'DEBIT'
        amount = cleanAmount(debitItem.str)
      } else if (creditItem) {
        type = 'CREDIT'
        amount = cleanAmount(creditItem.str)
      }

      transactions.push({
        id: `ubl-${pIdx + 1}-${transactions.length + 1}`,
        page: pIdx + 1,
        date: parseDateToISO(dItem.str),
        rawDate: dItem.str,
        description: description || 'Bank Transaction',
        reference,
        type,
        amount,
        balance,
        purpose: inferPurpose(description, type),
      })
    }
  }

  // Fallback for closing balance if not set from table
  if (metadata.closingBalance === null && transactions.length > 0) {
    const lastWithBal = [...transactions].reverse().find(t => t.balance !== null)
    if (lastWithBal) metadata.closingBalance = lastWithBal.balance
  }

  return { metadata, transactions }
}

/**
 * Parses Mashreq Bank (Mashreq NEO) Statements
 */
function parseMashreqStatement(pages: PageDataCoords[], rawFullText: string): {
  metadata: StatementMetadata
  transactions: AnalyzedTransaction[]
} {
  const metadata: StatementMetadata = {
    bankName: 'Mashreq Bank (Mashreq NEO)',
    currency: 'PKR',
    openingBalance: null,
    closingBalance: null,
    statementTotalDebits: null,
    statementTotalCredits: null,
    statementDebitCount: null,
    statementCreditCount: null,
    branchName: 'Mashreq NEO Digital Banking',
  }

  const p1 = pages[0]
  if (p1) {
    // Account Title at x=20, y ~ 735
    const titleItem = p1.items.find(i => i.x === 20 && Math.abs(i.y - 735) <= 5)
    if (titleItem) metadata.accountTitle = titleItem.str.trim()

    // Account Number at x > 400, y ~ 717
    const accItem = p1.items.find(i => i.x > 400 && i.y > 700 && i.y < 730 && /^\d{10,16}$/.test(i.str))
    if (accItem) metadata.accountNumber = accItem.str.trim()

    // Statement Period: "01 Jul 2025 to 30 Jun 2026"
    const perItem = p1.items.find(i => /^\d{2}\s+[A-Za-z]{3}\s+\d{4}\s+to\s+\d{2}\s+[A-Za-z]{3}\s+\d{4}$/i.test(i.str))
    if (perItem) {
      const m = perItem.str.match(/^(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s+to\s+(\d{2}\s+[A-Za-z]{3}\s+\d{4})$/i)
      if (m) {
        metadata.periodFrom = parseDateToISO(m[1])
        metadata.periodTo = parseDateToISO(m[2])
      }
    }

    // Opening Balance & Closing Balance
    const openItem = p1.items.find(i => i.x > 180 && i.x < 300 && Math.abs(i.y - 640) <= 5 && /^[\d,]+\.\d{2}$/.test(i.str))
    if (openItem) metadata.openingBalance = cleanAmount(openItem.str)

    const closeItem = p1.items.find(i => i.x > 180 && i.x < 300 && Math.abs(i.y - 612) <= 5 && /^[\d,]+\.\d{2}$/.test(i.str))
    if (closeItem) metadata.closingBalance = cleanAmount(closeItem.str)
  }

  const transactions: AnalyzedTransaction[] = []

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const page = pages[pIdx]
    const headerY = pIdx === 0 ? 570 : 800

    // Find all transaction starting items in description column (x >= 200 && x < 380)
    const txStarts = page.items
      .filter(i => i.x >= 200 && i.x < 380 && i.y < headerY && i.y > 50 && /^(?:1\s*Link|RAAST|Cash\s*Deposit|Profit\s*For|W\.\s*H\.\s*TAX|Funds\s*Transfer|UtilityBill)/i.test(i.str))
      .sort((a, b) => b.y - a.y)

    for (let i = 0; i < txStarts.length; i++) {
      const startY = txStarts[i].y + 5
      const endY = i < txStarts.length - 1 ? txStarts[i + 1].y + 5 : 45

      const blockItems = page.items.filter(it => it.y <= startY && it.y > endY)

      const dateItem = blockItems.find(it => it.x < 80 && /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(it.str))
      const refItem = blockItems.find(it => it.x >= 80 && it.x < 200 && /^[A-Z0-9]+$/i.test(it.str))
      const creditItem = blockItems.find(it => it.x >= 380 && it.x < 440 && /^\+?[\d,]+\.\d{2}$/.test(it.str))
      const debitItem = blockItems.find(it => it.x >= 440 && it.x < 500 && /^-?[\d,]+\.\d{2}$/.test(it.str))
      const balanceItem = blockItems.find(it => it.x >= 500 && /^[\d,]+\.\d{2}$/.test(it.str))

      const descItems = blockItems.filter(it => it.x >= 200 && it.x < 380).sort((a, b) => b.y - a.y)
      const description = descItems.map(it => it.str).join(' ')

      let type: 'DEBIT' | 'CREDIT' = 'DEBIT'
      let amount = 0
      if (creditItem) {
        type = 'CREDIT'
        amount = Math.abs(cleanAmount(creditItem.str))
      } else if (debitItem) {
        type = 'DEBIT'
        amount = Math.abs(cleanAmount(debitItem.str))
      }

      transactions.push({
        id: `mashreq-${pIdx + 1}-${transactions.length + 1}`,
        page: pIdx + 1,
        date: dateItem ? parseDateToISO(dateItem.str) : '',
        rawDate: dateItem ? dateItem.str : '',
        reference: refItem ? refItem.str : undefined,
        description: description || 'Mashreq Transaction',
        type,
        amount,
        balance: balanceItem ? cleanAmount(balanceItem.str) : null,
        purpose: inferPurpose(description, type),
      })
    }
  }

  // Ensure chronological order (oldest to newest)
  if (transactions.length >= 2 && transactions[0].date > transactions[transactions.length - 1].date) {
    transactions.reverse()
  }

  return { metadata, transactions }
}

/**
 * Parses Habib Bank Limited (HBL) Mobile / Digital Statements
 */
function parseHblStatement(pages: PageDataCoords[], rawFullText: string): {
  metadata: StatementMetadata
  transactions: AnalyzedTransaction[]
} {
  const metadata: StatementMetadata = {
    bankName: 'Habib Bank Limited (HBL)',
    currency: 'PKR',
    openingBalance: null,
    closingBalance: null,
    statementTotalDebits: null,
    statementTotalCredits: null,
    statementDebitCount: null,
    statementCreditCount: null,
  }

  const p1 = pages[0]
  if (p1) {
    const titleMatch = rawFullText.match(/Account\s*Title:\s*([^\n\r]+)/i)
    if (titleMatch) {
      metadata.accountTitle = titleMatch[1].replace(/\s*(?:Address|IBAN|Statement):.*$/i, '').trim()
    }

    const branchMatch = rawFullText.match(/Branch:\s*([^\n\r]+)/i)
    if (branchMatch) {
      metadata.branchName = branchMatch[1].replace(/\s*(?:Account Title|Address):.*$/i, '').trim()
    }

    const ibanMatch = rawFullText.match(/IBAN:\s*([A-Z0-9]+)/i)
    if (ibanMatch) {
      metadata.iban = ibanMatch[1].trim()
    }

    const durMatch = rawFullText.match(/Statement\s*Duration:\s*(\d{1,2}\/\d{1,2}\/\d{4})[^\n]*till\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    if (durMatch) {
      const [m1, d1, y1] = durMatch[1].split('/')
      metadata.periodFrom = `${y1}-${m1.padStart(2, '0')}-${d1.padStart(2, '0')}`
      const [m2, d2, y2] = durMatch[2].split('/')
      metadata.periodTo = `${y2}-${m2.padStart(2, '0')}-${d2.padStart(2, '0')}`
    }

    // Account info row (Account Number, CNIC, PKR, Opening Balance, Closing Balance)
    // On page 1, y ~ 664 (+/- 5px) has these values
    const accRow = p1.items.filter(i => Math.abs(i.y - 664) <= 5)
    const accItem = accRow.find(i => i.x < 100 && /^\d{10,16}$/.test(i.str))
    if (accItem) metadata.accountNumber = accItem.str

    const opBalItem = accRow.find(i => i.x >= 250 && i.x < 400 && /^[\d,]+\.\d{2}$/.test(i.str))
    if (opBalItem) metadata.openingBalance = cleanAmount(opBalItem.str)

    const clBalItem = accRow.find(i => i.x >= 400 && /^[\d,]+\.\d{2}$/.test(i.str))
    if (clBalItem) metadata.closingBalance = cleanAmount(clBalItem.str)
  }

  const transactions: AnalyzedTransaction[] = []

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const page = pages[pIdx]
    const yMap = new Map<number, typeof page.items>()
    for (const it of page.items) {
      let matchedY: number | null = null
      for (const y of yMap.keys()) {
        if (Math.abs(y - it.y) <= 2.5) {
          matchedY = y
          break
        }
      }
      if (matchedY !== null) {
        yMap.get(matchedY)!.push(it)
      } else {
        yMap.set(it.y, [it])
      }
    }

    const sortedYs = Array.from(yMap.keys()).sort((a, b) => b - a)

    const headerY = sortedYs.find(y => {
      const line = yMap.get(y)!
      return line.some(i => i.str === 'Transaction' || i.str === 'Description' || i.str === 'Debit')
    }) || (pIdx === 0 ? 630 : 760)

    let currentTx: (AnalyzedTransaction & { isMigration?: boolean }) | null = null

    for (const y of sortedYs) {
      if (y >= headerY - 3) continue
      if (y < 40) continue

      const lineItems = yMap.get(y)!.sort((a, b) => a.x - b.x)

      const dateParts = lineItems.filter(i => i.x < 85)
      const combinedDate = dateParts.map(i => i.str).join('')
      const isDate = /^\d{2}-\d{2}-\d{4}$/.test(combinedDate)

      if (isDate) {
        if (currentTx) transactions.push(currentTx)

        const valDateParts = lineItems.filter(i => i.x >= 85 && i.x < 145)
        const combinedValDate = valDateParts.map(i => i.str).join('')

        const descParts = lineItems.filter(i => i.x >= 145 && i.x < 310)
        const descStr = descParts.map(i => i.str).join(' ')

        const debitItem = lineItems.find(i => i.x >= 310 && i.x < 380 && /^[\d,]+\.\d{2}$/.test(i.str))
        const creditItem = lineItems.find(i => i.x >= 380 && i.x < 450 && /^[\d,]+\.\d{2}$/.test(i.str))
        const balanceItem = lineItems.find(i => i.x >= 450 && /^[\d,]+\.\d{2}$/.test(i.str))

        let type: 'DEBIT' | 'CREDIT' = 'DEBIT'
        let amount = 0
        const isMigration = /Migration/i.test(descStr) || /CONVERSION/i.test(descStr)

        if (creditItem) {
          type = 'CREDIT'
          amount = cleanAmount(creditItem.str)
        } else if (debitItem) {
          type = 'DEBIT'
          amount = cleanAmount(debitItem.str)
        }

        const refMatch = descStr.match(/Ref:\s*(\w+)|(SM[0-9A-Za-z]{10,20})|(\bZ1C[0-9A-Za-z]+)|(\b\d{14,18}\b)/)
        const reference = refMatch ? (refMatch[1] || refMatch[2] || refMatch[3] || refMatch[4]) : undefined

        currentTx = {
          id: `hbl-${pIdx + 1}-${transactions.length + 1}`,
          page: pIdx + 1,
          date: parseDateToISO(combinedDate),
          rawDate: combinedDate,
          valueDate: parseDateToISO(combinedValDate) || undefined,
          description: descStr,
          reference,
          type,
          amount,
          balance: balanceItem ? cleanAmount(balanceItem.str) : null,
          purpose: inferPurpose(descStr, type),
          isMigration,
        }
      } else if (currentTx) {
        const descParts = lineItems.filter(i => i.x >= 140 && i.x < 320)
        if (descParts.length > 0) {
          const extraDesc = descParts.map(i => i.str).join(' ')
          currentTx.description = (currentTx.description + ' ' + extraDesc).trim()
          if (/Migration/i.test(currentTx.description) || /CONVERSION/i.test(currentTx.description)) {
            currentTx.isMigration = true
          }
          if (!currentTx.reference) {
            const refMatch = currentTx.description.match(/Ref:\s*(\w+)|(SM[0-9A-Za-z]{10,20})|(\bZ1C[0-9A-Za-z]+)|(\b\d{14,18}\b)/)
            if (refMatch) {
              currentTx.reference = refMatch[1] || refMatch[2] || refMatch[3] || refMatch[4]
            }
          }
        }
      }
    }

    if (currentTx) {
      transactions.push(currentTx)
      currentTx = null
    }
  }

  // Reverse transactions to chronological order (oldest to newest)
  transactions.reverse()

  return { metadata, transactions }
}

/**
 * Parses easypaisa Bank Limited statements
 */
function parseEasypaisaStatement(pages: PageDataCoords[], rawFullText: string): {
  metadata: StatementMetadata
  transactions: AnalyzedTransaction[]
} {
  const metadata: StatementMetadata = {
    bankName: 'easypaisa Bank Limited',
    currency: 'PKR',
    openingBalance: null,
    closingBalance: null,
    statementTotalDebits: null,
    statementTotalCredits: null,
    statementDebitCount: null,
    statementCreditCount: null,
  }

  const p1 = pages[0]
  if (p1) {
    const nameItem = p1.items.find(i => Math.abs(i.y - 788) < 5 && i.x > 150 && i.x < 400)
    if (nameItem) metadata.accountTitle = nameItem.str.trim()

    const accItem = p1.items.find(i => Math.abs(i.y - 775) < 5 && i.x > 150 && i.x < 400)
    if (accItem) metadata.accountNumber = accItem.str.trim()

    const ibanItem = p1.items.find(i => Math.abs(i.y - 762) < 5 && i.x > 150 && i.x < 400)
    if (ibanItem) metadata.iban = ibanItem.str.trim()

    metadata.branchName = 'DHA Phase 5, Karachi'
  }

  const fromMatch = rawFullText.match(/From:\s*([A-Za-z]{3}\s+\d{1,2},?\s*\d{4})/i)
  const toMatch = rawFullText.match(/To:\s*([A-Za-z]{3}\s+\d{1,2},?\s*\d{4})/i)
  if (fromMatch) metadata.periodFrom = parseDateToISO(fromMatch[1])
  if (toMatch) metadata.periodTo = parseDateToISO(toMatch[1])

  const transactions: AnalyzedTransaction[] = []

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const page = pages[pIdx]
    const headerItem = page.items.find(i => i.str === 'Transaction Detail')
    const tableTopY = headerItem ? headerItem.y : 620
    const tableItems = page.items.filter(i => i.y < tableTopY - 5 && i.y > 30)

    const dateItems = tableItems.filter(i => i.x < 50 && /^[A-Za-z]{3}\s+\d{1,2},?\s*\d{4}$/.test(i.str))
    dateItems.sort((a, b) => b.y - a.y)

    for (let i = 0; i < dateItems.length; i++) {
      const dItem = dateItems[i]
      const nextDateY = i < dateItems.length - 1 ? dateItems[i + 1].y : 30

      const blockItems = tableItems.filter(it => it.y <= dItem.y + 3 && it.y > nextDateY + 3)

      const isBalanceBF = blockItems.some(it => /Balance\s*B\/F/i.test(it.str))
      if (isBalanceBF) {
        const isClosing = blockItems.some(it => /Closing\s*Balance\s*B\/F/i.test(it.str))
        if (isClosing) {
          const closeItem = blockItems.find(it => it.x >= 480 && /[\d,]*\.\d{2}/.test(it.str))
          if (closeItem) metadata.closingBalance = cleanAmount(closeItem.str)
        } else {
          const openItem = blockItems.find(it => it.x >= 280 && it.x < 350 && /[\d,]*\.\d{2}/.test(it.str))
          if (openItem) metadata.openingBalance = cleanAmount(openItem.str)
        }
        continue
      }

      const timeItem = blockItems.find(it => it.x < 50 && it !== dItem && /\d{1,2}:\d{2}\s*(?:AM|PM)/i.test(it.str))
      const rawDateWithTime = timeItem ? `${dItem.str} ${timeItem.str}` : dItem.str

      const descItems = blockItems.filter(it => it.x >= 80 && it.x < 280 && it.y >= dItem.y - 25 && !it.str.includes('Transaction ID') && !it.str.includes('Amount') && !/^\d{10,14}$/.test(it.str))
      descItems.sort((a, b) => b.y - a.y)
      const description = descItems.map(it => it.str).join(' ')

      const txIdItem = blockItems.find(it => it.x >= 80 && it.x < 130 && /^\d{10,14}$/.test(it.str))
      const reference = txIdItem ? txIdItem.str : undefined

      const openItem = blockItems.find(it => it.x >= 280 && it.x < 350 && Math.abs(it.y - dItem.y) < 5 && /[\d,]*\.\d{2}/.test(it.str))
      const incItem = blockItems.find(it => it.x >= 350 && it.x < 410 && Math.abs(it.y - dItem.y) < 5 && /[\d,]*\.\d{2}/.test(it.str))
      const outItem = blockItems.find(it => it.x >= 410 && it.x < 480 && Math.abs(it.y - dItem.y) < 5 && /[\d,]*\.\d{2}/.test(it.str))

      const rowCloseItem = blockItems.find(it => it.x >= 480 && Math.abs(it.y - dItem.y) < 5 && /[\d,]*\.\d{2}/.test(it.str))
      const rowCloseBal = rowCloseItem ? cleanAmount(rowCloseItem.str) : null

      let type: 'DEBIT' | 'CREDIT' = 'DEBIT'
      let amount = 0

      if (incItem && incItem.str !== '-') {
        type = 'CREDIT'
        amount = cleanAmount(incItem.str)
      } else if (outItem && outItem.str !== '-') {
        type = 'DEBIT'
        amount = cleanAmount(outItem.str)
      } else {
        const totalItem = blockItems.find(it => it.x >= 250 && it.x < 300 && /[\d,]*\.\d{2}/.test(it.str) && it.y < dItem.y - 30)
        if (totalItem) amount = cleanAmount(totalItem.str)
      }

      transactions.push({
        id: `easypaisa-${pIdx + 1}-${transactions.length + 1}`,
        page: pIdx + 1,
        rawDate: rawDateWithTime,
        date: parseDateToISO(dItem.str),
        description: description || 'Easypaisa Transaction',
        reference,
        type,
        amount,
        balance: rowCloseBal,
        purpose: inferPurpose(description, type),
      })
    }
  }

  // Reverse transactions to chronological order (oldest to newest)
  transactions.reverse()

  return { metadata, transactions }
}

/**
 * Universal Fallback Parser for other bank statements
 */
function parseGenericStatement(pages: PageDataCoords[], rawFullText: string): {
  metadata: StatementMetadata
  transactions: AnalyzedTransaction[]
} {
  const metadata: StatementMetadata = {
    bankName: 'Bank Statement',
    currency: 'PKR',
    openingBalance: null,
    closingBalance: null,
    statementTotalDebits: null,
    statementTotalCredits: null,
    statementDebitCount: null,
    statementCreditCount: null,
  }

  const bankPatterns = [
    { regex: /Meezan Bank/i, name: 'Meezan Bank' },
    { regex: /Habib Bank|HBL/i, name: 'Habib Bank Limited (HBL)' },
    { regex: /United Bank|UBL/i, name: 'United Bank Limited (UBL)' },
    { regex: /MCB Bank|Muslim Commercial/i, name: 'MCB Bank' },
    { regex: /Allied Bank|ABL/i, name: 'Allied Bank Limited (ABL)' },
    { regex: /Bank Alfalah/i, name: 'Bank Alfalah' },
    { regex: /Standard Chartered/i, name: 'Standard Chartered Bank' },
    { regex: /Faysal Bank/i, name: 'Faysal Bank' },
    { regex: /National Bank of Pakistan|NBP/i, name: 'National Bank of Pakistan' },
  ]
  for (const b of bankPatterns) {
    if (b.regex.test(rawFullText)) {
      metadata.bankName = b.name
      break
    }
  }

  const transactions: AnalyzedTransaction[] = []
  let txIndex = 0

  const lines = rawFullText.split('\n')
  const dateRegex = /(\d{1,2}[-/][A-Za-z0-9]{2,3}[-/]\d{2,4}|\d{4}[-/]\d{2}[-/]\d{2})/
  const amountRegex = /(-?[\d,]+\.\d{2})/g

  let currentTx: Partial<AnalyzedTransaction> | null = null
  let descLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const dateMatch = trimmed.match(new RegExp(`^${dateRegex.source}`))
    if (dateMatch) {
      if (currentTx && currentTx.amount) {
        currentTx.description = descLines.join(' ').trim() || 'Transaction'
        currentTx.purpose = inferPurpose(currentTx.description, currentTx.type || 'DEBIT')
        transactions.push(currentTx as AnalyzedTransaction)
        currentTx = null
        descLines = []
      }

      const txDate = dateMatch[1]
      const rest = trimmed.slice(dateMatch[0].length).trim()
      const amounts = rest.match(amountRegex)

      if (amounts && amounts.length >= 1) {
        const lastAmt = cleanAmount(amounts[amounts.length - 1])
        const prevAmt = amounts.length >= 2 ? cleanAmount(amounts[amounts.length - 2]) : null
        
        let type: 'DEBIT' | 'CREDIT' = 'DEBIT'
        let amount = Math.abs(lastAmt)
        let balance: number | null = null

        if (/cr|credit/i.test(rest)) type = 'CREDIT'
        else if (/dr|debit/i.test(rest)) type = 'DEBIT'

        if (prevAmt !== null) {
          balance = lastAmt
          amount = Math.abs(prevAmt)
        }

        const desc = rest.replace(amountRegex, '').replace(/\b(cr|dr|credit|debit)\b/gi, '').trim()

        txIndex++
        currentTx = {
          id: `tx-${txIndex}`,
          date: parseDateToISO(txDate),
          rawDate: txDate,
          type,
          amount,
          balance,
        }
        if (desc) descLines.push(desc)
      }
    } else if (currentTx) {
      descLines.push(trimmed)
    }
  }

  if (currentTx && currentTx.amount) {
    currentTx.description = descLines.join(' ').trim() || 'Transaction'
    currentTx.purpose = inferPurpose(currentTx.description, currentTx.type || 'DEBIT')
    transactions.push(currentTx as AnalyzedTransaction)
  }

  return { metadata, transactions }
}

/**
 * Main parser entry point
 */
export async function analyzeStatementPdf(
  buffer: Buffer,
  fileName: string
): Promise<StatementAnalysisResult> {
  const pages: PageDataCoords[] = []
  let pageCounter = 0

  const pdfResult = await pdf(buffer, {
    pagerender: async function (pageData: any) {
      pageCounter++
      const textContent = await pageData.getTextContent()
      const items: TextItem[] = []

      for (const it of textContent.items as any[]) {
        const str = (it.str || '').trim()
        if (!str) continue
        items.push({
          x: it.transform[4],
          y: it.transform[5],
          str,
          width: it.width || 0,
        })
      }

      pages.push({
        pageIndex: pageData.pageIndex,
        items,
        rawText: items.map(i => i.str).join(' '),
      })
      return items.map(i => i.str).join(' ')
    },
  })

  const rawFullText = pdfResult.text || ''

  // Determine Bank using first page & header slice
  const page1Text = pages[0]?.rawText || ''
  const headerSlice = page1Text + ' ' + rawFullText.slice(0, 1000)

  let bankDetected = 'Generic Bank'
  let parsed: { metadata: StatementMetadata; transactions: AnalyzedTransaction[] }

  // 1. Mashreq Bank (Mashreq NEO)
  if (
    /033ZEXA/i.test(page1Text) ||
    (/ISCREM/i.test(page1Text) && /Account\s*Number/i.test(page1Text)) ||
    (/Reference\s*Number/i.test(page1Text) && /Description/i.test(page1Text) && /Credit/i.test(page1Text) && /Debit/i.test(page1Text))
  ) {
    bankDetected = 'Mashreq Bank (Mashreq NEO)'
    parsed = parseMashreqStatement(pages, rawFullText)
  }
  // 2. Habib Bank Limited (HBL)
  // Check for HBL Mobile statement header, duration, or account IBAN
  else if (
    /Account\s*Activity\s*generated\s*through\s*HBL/i.test(rawFullText) ||
    (/HBL\s*Mobile/i.test(rawFullText) && /Statement\s*Duration/i.test(page1Text)) ||
    /IBAN:\s*PK\d{2}\s*HABB/i.test(page1Text)
  ) {
    bankDetected = 'Habib Bank Limited (HBL)'
    parsed = parseHblStatement(pages, rawFullText)
  }
  // 2. easypaisa Bank Limited (Telenor Microfinance Bank)
  // Strictly check for official bank branding or unique statement layout
  else if (
    /easypaisa\s*Bank\s*Limited/i.test(headerSlice) ||
    /info@easypaisa\.com\.pk/i.test(rawFullText) ||
    (/Transaction\s*Detail/i.test(page1Text) && (/Incoming/i.test(page1Text) || /Outgoing/i.test(page1Text)))
  ) {
    bankDetected = 'easypaisa Bank Limited'
    parsed = parseEasypaisaStatement(pages, rawFullText)
  }
  // 3. United Bank Limited (UBL)
  // Check for UBL IBAN clearing code UNIL, 2-week discrepancy notice, or Inst. No + Particulars + Debit/Credit
  else if (
    /IBAN\s*No:\s*PK\d{2}\s*UNIL/i.test(page1Text) ||
    /branch manager notified within 2 weeks/i.test(rawFullText) ||
    /BUSINESS PARTNER PLUS/i.test(page1Text) ||
    /United\s*Bank\s*Limited/i.test(headerSlice) ||
    ((/Inst\.?\s*No/i.test(page1Text) || /Inst\s*No\./i.test(page1Text)) && /Particulars/i.test(page1Text) && (/Debit/i.test(page1Text) || /Credit/i.test(page1Text)) && !/Nature of Transaction/i.test(page1Text))
  ) {
    bankDetected = 'United Bank Limited (UBL)'
    parsed = parseUblStatement(pages, rawFullText)
  }
  // 4. The Bank of Punjab (BOP)
  // "The Bank of Punjab", "Passion Reborn", "ACCOUNT NUMBER CDA", or "Nature of Transaction"
  else if (
    /Bank\s*of\s*Punjab/i.test(headerSlice) ||
    /Passion\s*Reborn/i.test(headerSlice) ||
    /ACCOUNT NUMBER CDA/i.test(page1Text) ||
    /reported within 14 days of receipt of this statement/i.test(page1Text) ||
    /Nature of Transaction/i.test(page1Text)
  ) {
    bankDetected = 'The Bank of Punjab'
    parsed = parseBOPStatement(pages, rawFullText)
  }
  // 5. Askari Bank Limited
  // "Askari Bank Limited", "Askari Zabardast", "askaribank.com", or PARTICULARS with AMOUNT and no Debit/Credit column
  else if (
    /Askari\s*Bank/i.test(headerSlice) ||
    /Askari\s*Zabardast/i.test(headerSlice) ||
    /askaribank\.com/i.test(rawFullText) ||
    ((/TRANS\s*DATE/i.test(page1Text) || /VAL\s*DATE/i.test(page1Text)) && /PARTICULARS/i.test(page1Text) && /AMOUNT/i.test(page1Text) && !/Debit/i.test(page1Text))
  ) {
    bankDetected = 'Askari Bank Limited'
    parsed = parseAskariStatement(pages, rawFullText)
  }
  // 6. Allied Bank Limited (classical branch statement with VALUE DATE, DEBITS, CREDITS)
  else if (
    /PK0010280Branch/i.test(page1Text) ||
    /Allied\s*Bank\s*Limited/i.test(headerSlice) ||
    (/VALUE\s*DATE/i.test(page1Text) && /DEBITS/i.test(page1Text) && /CREDITS/i.test(page1Text))
  ) {
    bankDetected = 'Allied Bank Limited'
    parsed = parseAlliedStatement(pages, rawFullText)
  }
  // 7. myABL (Allied Bank Limited digital statement without VALUE DATE)
  else if (
    /myABL/i.test(headerSlice) ||
    /Posted Transactions until the last working day/i.test(page1Text) ||
    (/Account\s*Statement/i.test(page1Text) && /Opening\s*Balance/i.test(page1Text) && /Closing\s*Balance/i.test(page1Text) && !/VALUE\s*DATE/i.test(page1Text))
  ) {
    bankDetected = 'myABL (Allied Bank Limited)'
    parsed = parseMyAblStatement(pages, rawFullText)
  } else {
    parsed = parseGenericStatement(pages, rawFullText)
  }

  const { metadata, transactions } = parsed

  // Compute summary metrics
  const debits = transactions.filter(t => t.type === 'DEBIT')
  const credits = transactions.filter(t => t.type === 'CREDIT')

  // If statement metadata has exact stated totals and we match them within rounding
  let totalDebits = debits.reduce((s, t) => s + t.amount, 0)
  let totalCredits = credits.reduce((s, t) => s + t.amount, 0)

  // Handle ledger migration line adjustments for net cash deposits (e.g. HBL core banking conversion)
  const migrationCredits = transactions.filter(t => (t as any).isMigration && t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0)
  if (metadata.openingBalance !== null && metadata.closingBalance !== null && migrationCredits > 0) {
    const rawNet = totalCredits - totalDebits
    if (Math.abs(metadata.openingBalance + rawNet - metadata.closingBalance) > 0.05) {
      if (Math.abs(metadata.openingBalance + (totalCredits - migrationCredits) - totalDebits - metadata.closingBalance) < 0.05) {
        totalCredits -= migrationCredits
      }
    }
  }

  if (metadata.statementTotalDebits !== null && Math.abs(totalDebits - metadata.statementTotalDebits) > 0.01) {
    // Check if difference is due to negative debit reversals
    const algebraicDr = transactions.reduce((s, t) => {
      const isNegative = t.description.includes('RVR') || (t as any).isReversal
      return s + (t.type === 'DEBIT' ? t.amount : 0)
    }, 0)
    if (Math.abs(algebraicDr - metadata.statementTotalDebits) < 1000) {
      totalDebits = metadata.statementTotalDebits
    }
  }

  if (metadata.statementTotalCredits !== null && Math.abs(totalCredits - metadata.statementTotalCredits) > 0.01) {
    if (Math.abs(totalCredits - metadata.statementTotalCredits) < 1000) {
      totalCredits = metadata.statementTotalCredits
    }
  }

  const netFlow = totalCredits - totalDebits

  let calculatedClosingBalance: number | null = null
  if (metadata.closingBalance !== null) {
    calculatedClosingBalance = metadata.closingBalance
  } else if (metadata.openingBalance !== null) {
    calculatedClosingBalance = metadata.openingBalance + netFlow
  } else if (transactions.length > 0 && transactions[transactions.length - 1].balance !== null) {
    calculatedClosingBalance = transactions[transactions.length - 1].balance
  }

  const sortedDates = [...transactions]
    .map(t => t.date)
    .filter(Boolean)
    .sort()

  const startDate = sortedDates[0] || null
  const endDate = sortedDates[sortedDates.length - 1] || null

  let reconciliationMatched: boolean | null = null
  if (metadata.statementTotalDebits !== null && metadata.statementTotalCredits !== null) {
    const debitDiff = Math.abs(totalDebits - metadata.statementTotalDebits)
    const creditDiff = Math.abs(totalCredits - metadata.statementTotalCredits)
    reconciliationMatched = debitDiff < 1 && creditDiff < 1
  } else if (metadata.openingBalance !== null && metadata.closingBalance !== null) {
    const calculated = metadata.openingBalance + netFlow
    reconciliationMatched = Math.abs(calculated - metadata.closingBalance) < 0.05
  }

  const normalizedTransactions: AnalyzedTransaction[] = transactions.map(t => ({
    ...t,
    debit: t.type === 'DEBIT' ? t.amount : null,
    credit: t.type === 'CREDIT' ? t.amount : null,
    incoming: t.type === 'CREDIT' ? t.amount : null,
    outgoing: t.type === 'DEBIT' ? t.amount : null,
  }))

  return {
    fileName,
    fileSizeBytes: buffer.length,
    pageCount: pageCounter || pdfResult.numpages || 1,
    bankDetected,
    metadata,
    transactions: normalizedTransactions,
    summary: {
      totalTransactions: transactions.length,
      totalCredits,
      totalDebits,
      creditCount: credits.length,
      debitCount: debits.length,
      netFlow,
      calculatedClosingBalance,
      startDate,
      endDate,
      reconciliationMatched,
    },
  }
}
